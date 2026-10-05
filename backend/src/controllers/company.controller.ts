import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { verifyDomainLegitimacy } from "../services/verification.service.js";
import { NotificationService } from "../services/notification.service.js";
import { scopeQueryByCompany } from "../middlewares/companyScope.js";

/**
 * Onboard a new organization with automated DNS domain verification and optional client account creation
 */
export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, domain, registrationNumber, country, industry, user: userData } = req.body;
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

    // Check client user email uniqueness if provided
    if (userData?.email) {
      const cleanEmail = userData.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return sendError(
          res,
          `An account with email '${cleanEmail}' already exists.`,
          409,
          "USER_EXISTS"
        );
      }
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

    // Create client user account (Role: Assessor) linked to this company
    let createdUser = null;
    if (userData?.email) {
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
      const passwordHash = userData.password
        ? await bcrypt.hash(userData.password, saltRounds)
        : undefined;

      createdUser = await User.create({
        name: userData.name || name,
        email: userData.email.toLowerCase().trim(),
        passwordHash,
        role: "Assessor",
        status: "Active",
        companyId: company._id,
      });

      await AuditLog.create({
        actorId,
        actorEmail,
        action: "USER_INVITED",
        entity: "User",
        entityId: createdUser._id.toString(),
        after: {
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          companyId: company._id.toString(),
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    } else if (req.user?.role === "Assessor" && actorId) {
      // Auto-associate assessor with company if assessor is unassigned
      const user = await User.findById(actorId);
      if (user && !user.companyId) {
        user.companyId = company._id;
        await user.save();
        createdUser = user;
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
        user: createdUser
          ? {
              _id: createdUser._id,
              name: createdUser.name,
              email: createdUser.email,
              role: createdUser.role,
              status: createdUser.status,
            }
          : null,
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
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
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

    // Attach client user for each company
    const companyIds = companies.map((c) => c._id);
    const users = await User.find({ companyId: { $in: companyIds } })
      .select("name email role status companyId");
    const userMap = new Map();
    users.forEach((u) => {
      if (u.companyId) userMap.set(u.companyId.toString(), u);
    });

    const enriched = companies.map((c) => {
      const obj = c.toObject();
      return {
        ...obj,
        clientUser: userMap.get(c._id.toString()) || null,
      };
    });

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
 * Fetch company profile by ID
 */
export async function getCompanyById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);

    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    const clientUser = await User.findOne({ companyId: id })
      .select("-passwordHash -mfa.secret -mfa.tempSecret -mfa.recoveryCodes");

    return sendSuccess(res, {
      ...company.toObject(),
      clientUser: clientUser || null,
    });
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

    // Synchronize client user account status with company status (only affects client Assessors, never staff/Admin)
    const userNewStatus = status === "Active" ? "Active" : "Deactivated";
    await User.updateMany(
      { companyId: id, role: "Assessor" },
      { status: userNewStatus }
    );

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
