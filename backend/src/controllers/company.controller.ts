import { Request, Response, NextFunction } from "express";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { verifyDomainLegitimacy } from "../services/verification.service.js";
import { NotificationService } from "../services/notification.service.js";
import { scopeQueryByCompany } from "../middlewares/companyScope.js";

/**
 * Onboard a new organization with automated DNS domain verification
 */
export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, domain, registrationNumber, country, industry } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    // Clean and lowercase domain
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Check domain uniqueness
    const existing = await Company.findOne({ domain: cleanDomain });
    if (existing) {
      return sendError(
        res,
        `A company with domain '${cleanDomain}' is already onboarded.`,
        409,
        "DOMAIN_EXISTS"
      );
    }

    // Run automated DNS legitimacy check
    const verificationResult = await verifyDomainLegitimacy(cleanDomain);

    const company = await Company.create({
      name,
      domain: cleanDomain,
      registrationNumber,
      country,
      industry,
      verificationStatus: verificationResult.verificationStatus,
      status: "Active",
      verificationAuditTrail: {
        verifiedAt: new Date(),
        verifiedBy: "SYSTEM_DNS_VERIFIER",
        dnsCheckResult: verificationResult.dnsResolved,
        notes: verificationResult.diagnosticNotes,
      },
    });

    // Auto-associate assessor with company if assessor is unassigned
    if (req.user?.role === "Assessor" && actorId) {
      const user = await User.findById(actorId);
      if (user && !user.companyId) {
        user.companyId = company._id;
        await user.save();
      }
    }

    // Audit Logging
    await AuditLog.create({
      actorId,
      actorEmail,
      action: "COMPANY_ONBOARDED",
      entity: "Company",
      entityId: company._id.toString(),
      after: {
        name: company.name,
        domain: company.domain,
        verificationStatus: company.verificationStatus,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Notification Hooks
    await NotificationService.onCompanyOnboarded(company, { id: actorId || "", email: actorEmail });
    if (company.verificationStatus === "Pending") {
      await NotificationService.onDomainVerificationPending(company, verificationResult.diagnosticNotes);
    }

    return sendSuccess(
      res,
      {
        company,
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
 * List companies with role scoping, search, and pagination
 */
export async function getCompanies(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const baseFilter: Record<string, unknown> = {};

    if (req.user?.role !== "Admin" && !req.user?.companyId && req.user?.userId) {
      const u = await User.findById(req.user.userId);
      if (u?.companyId) {
        req.user.companyId = u.companyId.toString();
      }
    }

    // Apply company scoping for non-Admins using '_id' as the document key
    const scopedFilter = scopeQueryByCompany(req, baseFilter, "_id");

    // Search query for Admins
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

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, companies, 200, {
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
 * Fetch company profile by ID
 */
export async function getCompanyById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);

    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    return sendSuccess(res, company);
  } catch (err) {
    next(err);
  }
}

/**
 * Update company profile metadata
 */
export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, registrationNumber, country, industry } = req.body;
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
    };

    if (name) company.name = name;
    if (registrationNumber !== undefined) company.registrationNumber = registrationNumber;
    if (country !== undefined) company.country = country;
    if (industry !== undefined) company.industry = industry;

    await company.save();

    await AuditLog.create({
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
 * Administrative verification override (Verified / Pending / Rejected)
 */
export async function verifyCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { verificationStatus, notes } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "unknown";

    const company = await Company.findById(id);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const previousStatus = company.verificationStatus;
    company.verificationStatus = verificationStatus;
    company.verificationAuditTrail = {
      verifiedAt: new Date(),
      verifiedBy: actorEmail,
      dnsCheckResult: company.verificationAuditTrail?.dnsCheckResult ?? true,
      notes: notes || `Manually marked as ${verificationStatus} by Admin ${actorEmail}`,
    };

    await company.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "COMPANY_VERIFICATION_UPDATED",
      entity: "Company",
      entityId: company._id.toString(),
      before: { verificationStatus: previousStatus },
      after: {
        verificationStatus: company.verificationStatus,
        notes: company.verificationAuditTrail.notes,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Company verification status updated to '${verificationStatus}'`,
      company,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Administrative status toggle (Active / Suspended)
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
      message: `Company operational status updated to '${status}'`,
      company,
    });
  } catch (err) {
    next(err);
  }
}
