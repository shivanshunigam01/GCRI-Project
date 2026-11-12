import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Company } from "../models/Company.js";
import { AuditLog } from "../models/AuditLog.js";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { verifyDomainLegitimacy } from "../services/verification.service.js";
import { NotificationService } from "../services/notification.service.js";
import { isAuditorAssignedToOrg } from "../middlewares/companyScope.js";

/**
 * 3. Client Organization Onboarding (TenantAdmin only)
 * - Creates a Client Organization within the TenantAdmin's tenant with name, domain,
 *   plan tier (Gold, Silver, Bronze), industry, and country.
 * - Verifies domain ownership through DNS (Pending -> Verified or Rejected).
 * - Client Organizations have no login; auditors collect their evidence.
 */
export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, domain, registrationNumber, country, industry, activePlan } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";
    const tenantId = req.user?.tenantId;

    if (req.user?.role !== "TenantAdmin") {
      return sendError(
        res,
        "Only a TenantAdmin can onboard client organizations.",
        403,
        "TENANT_ADMIN_REQUIRED"
      );
    }

    if (!tenantId) {
      return sendError(
        res,
        "Your TenantAdmin account is not associated with an active tenant.",
        400,
        "TENANT_NOT_LINKED"
      );
    }

    // Clean and lowercase domain
    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

    // Check domain uniqueness within this tenant
    const existing = await Company.findOne({
      tenantId: new Types.ObjectId(tenantId),
      domain: cleanDomain,
    });
    if (existing) {
      return sendError(
        res,
        `A client organization with domain '${cleanDomain}' is already onboarded in your tenant.`,
        409,
        "DOMAIN_EXISTS"
      );
    }

    // Run automated DNS legitimacy check
    const verificationResult = await verifyDomainLegitimacy(cleanDomain);

    const company = await Company.create({
      tenantId: new Types.ObjectId(tenantId),
      name,
      domain: cleanDomain,
      registrationNumber,
      country,
      industry,
      activePlan: activePlan || "Bronze",
      verificationStatus: verificationResult.verificationStatus,
      status: "Active",
      createdBy: actorId ? new Types.ObjectId(actorId) : undefined,
      verificationAuditTrail: {
        verifiedAt: new Date(),
        verifiedBy: "SYSTEM_DNS_VERIFIER",
        dnsCheckResult: verificationResult.dnsResolved,
        notes: verificationResult.diagnosticNotes,
      },
    });

    await AuditLog.create({
      tenantId: new Types.ObjectId(tenantId),
      actorId,
      actorEmail,
      action: "COMPANY_ONBOARDED",
      entity: "Company",
      entityId: company._id.toString(),
      after: {
        tenantId,
        name: company.name,
        domain: company.domain,
        activePlan: company.activePlan,
        verificationStatus: company.verificationStatus,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await NotificationService.onCompanyOnboarded(company, {
      id: actorId || "",
      email: actorEmail,
    });
    if (company.verificationStatus === "Pending") {
      await NotificationService.onDomainVerificationPending(
        company,
        verificationResult.diagnosticNotes
      );
    }

    return sendSuccess(
      res,
      {
        company,
        user: null, // Client Organizations have no login
        verification: {
          dnsResolved: verificationResult.dnsResolved,
          recordsFound: verificationResult.recordsFound,
          notes: verificationResult.diagnosticNotes,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * List Client Organizations within the caller's active tenant.
 * Visible to TenantAdmin and any Auditor belonging to that tenant.
 */
export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role === "SuperAdmin") {
      return sendError(
        res,
        "Super Admin manages tenants at the platform level and cannot view tenant client organizations.",
        403,
        "SUPER_ADMIN_TENANT_DATA_RESTRICTED"
      );
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const scopedFilter: Record<string, unknown> = {};

    if (req.user?.tenantId) {
      scopedFilter.tenantId = new Types.ObjectId(req.user.tenantId);
    } else if (req.user?.companyId) {
      scopedFilter._id = new Types.ObjectId(req.user.companyId);
    } else {
      return sendSuccess(res, [], 200, { page, limit, total: 0, totalPages: 0 });
    }

    if (req.query.search && typeof req.query.search === "string") {
      const regex = new RegExp(req.query.search.trim(), "i");
      scopedFilter.$or = [{ name: regex }, { domain: regex }];
    }

    if (req.query.status && typeof req.query.status === "string") {
      scopedFilter.status = req.query.status;
    }

    if (req.query.verificationStatus && typeof req.query.verificationStatus === "string") {
      scopedFilter.verificationStatus = req.query.verificationStatus;
    }

    const [companies, total] = await Promise.all([
      Company.find(scopedFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Company.countDocuments(scopedFilter),
    ]);

    const enriched = companies.map((c) => ({
      ...c.toObject(),
      clientUser: null, // Client Organizations have no login
    }));

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, enriched, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch Client Organization profile by ID (TenantAdmin or Auditor in same tenant)
 */
export async function getCompanyById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);

    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    return sendSuccess(res, {
      ...company.toObject(),
      clientUser: null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Client Organization profile metadata & plan tier (TenantAdmin only, own tenant)
 */
export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, registrationNumber, country, industry, activePlan } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const beforeSnapshot = {
      name: company.name,
      registrationNumber: company.registrationNumber,
      country: company.country,
      industry: company.industry,
      activePlan: company.activePlan,
    };

    if (name) company.name = name;
    if (registrationNumber !== undefined) company.registrationNumber = registrationNumber;
    if (country !== undefined) company.country = country;
    if (industry !== undefined) company.industry = industry;
    if (activePlan !== undefined) company.activePlan = activePlan;

    await company.save();

    await AuditLog.create({
      tenantId: company.tenantId,
      actorId,
      actorEmail,
      action: "COMPANY_UPDATED",
      entity: "Company",
      entityId: company._id.toString(),
      before: beforeSnapshot,
      after: {
        name: company.name,
        registrationNumber: company.registrationNumber,
        country: company.country,
        industry: company.industry,
        activePlan: company.activePlan,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, company);
  } catch (err) {
    next(err);
  }
}

/**
 * Verify client DNS & optionally set plan tier (TenantAdmin only, own tenant)
 * Pending -> Verified or Rejected
 */
export async function verifyCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { verificationStatus, activePlan, notes } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const previousStatus = company.verificationStatus;
    const previousPlan = company.activePlan;
    company.verificationStatus = verificationStatus;
    if (activePlan) {
      company.activePlan = activePlan;
    }
    company.verificationAuditTrail = {
      verifiedAt: new Date(),
      verifiedBy: actorEmail,
      dnsCheckResult: company.verificationAuditTrail?.dnsCheckResult ?? true,
      notes: notes || `Manually marked as ${verificationStatus} by TenantAdmin ${actorEmail}`,
    };

    await company.save();

    await AuditLog.create({
      tenantId: company.tenantId,
      actorId,
      actorEmail,
      action: "COMPANY_VERIFICATION_UPDATED",
      entity: "Company",
      entityId: company._id.toString(),
      before: { verificationStatus: previousStatus, activePlan: previousPlan },
      after: {
        verificationStatus: company.verificationStatus,
        activePlan: company.activePlan,
        notes: company.verificationAuditTrail.notes,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Client organization verification status updated to '${verificationStatus}'`,
      company,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Suspend or reactivate a Client Organization (TenantAdmin only, own tenant)
 */
export async function updateCompanyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const previousStatus = company.status;
    company.status = status;
    await company.save();

    await AuditLog.create({
      tenantId: company.tenantId,
      actorId,
      actorEmail,
      action: "COMPANY_STATUS_UPDATED",
      entity: "Company",
      entityId: company._id.toString(),
      before: { status: previousStatus },
      after: { status: company.status, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Client organization operational status updated to '${status}'`,
      company,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve historical assessment trends and score progression for a Client Organization
 * Accessible to TenantAdmin (own tenant) and Auditor (own tenant, scoped to accessible sessions)
 */
export async function getCompanyTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "SuperAdmin") {
      return sendError(
        res,
        "Super Admin cannot read assessment content or score trends.",
        403,
        "SUPER_ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const isAllowed = await isAuditorAssignedToOrg(req.user.userId, id, req.user.tenantId);
    if (!isAllowed) {
      return sendError(
        res,
        "Access denied. This client organization belongs to another tenant.",
        403,
        "CROSS_TENANT_ACCESS_DENIED"
      );
    }

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const sessionFilter: Record<string, unknown> = {
      companyId: id,
      status: "Submitted",
      scoreSnapshot: { $exists: true },
    };

    // Auditors only see assessments they created or that were explicitly shared with them
    if (req.user.role === "Auditor") {
      const uid = new Types.ObjectId(req.user.userId);
      sessionFilter.$or = [
        { conductedByUserId: uid },
        { createdByUserId: uid },
        { "sharedWith.auditorId": uid },
      ];
    }

    const sessions = await AssessmentSession.find(sessionFilter).sort({ submittedAt: 1 });

    const trends = sessions.map((s) => ({
      assessmentId: s._id,
      assessmentType: s.assessmentType,
      frameworkVersion: s.frameworkVersion,
      submittedAt: s.submittedAt,
      overallPercentage: s.scoreSnapshot?.overallPercentage || 0,
      maturityLevel: s.scoreSnapshot?.maturityLevel || "Initial",
      controlsAssessed: s.scoreSnapshot?.totalControlsAssessed || 0,
      exceptionsNoted: s.scoreSnapshot?.totalExceptionsNoted || 0,
      pillarScores:
        s.scoreSnapshot?.pillarScores.map((p) => ({
          pillarId: p.pillarId,
          pillarName: p.pillarName,
          percentage: p.percentage,
        })) || [],
    }));

    let progressionDelta = 0;
    if (trends.length >= 2) {
      const latest = trends[trends.length - 1].overallPercentage;
      const baseline = trends[0].overallPercentage;
      progressionDelta = Math.round((latest - baseline) * 10) / 10;
    }

    return sendSuccess(res, {
      company: {
        _id: company._id,
        name: company.name,
        domain: company.domain,
        activePlan: company.activePlan || "Bronze",
      },
      totalCompletedAssessments: trends.length,
      progressionDeltaPercentage: progressionDelta,
      history: trends,
    });
  } catch (err) {
    next(err);
  }
}
