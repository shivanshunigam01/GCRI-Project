import { Request, Response, NextFunction } from "express";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { AuditLog } from "../models/AuditLog.js";
import { AssessmentFramework } from "../models/AssessmentFramework.js";
import { AuditorOrganization } from "../models/AuditorOrganization.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { getAssignedOrganizationIds, isAuditorAssignedToOrg } from "../middlewares/companyScope.js";
import { logAuthorizationDenied } from "./assessment.controller.js";

const CANONICAL_GRAICE_PILLARS = [
  { key: "P1", pillarId: "ethical-leadership", number: 1, name: "Ethical Leadership", defaultControls: 10 },
  { key: "P2", pillarId: "purpose-driven-innovation", number: 2, name: "Purpose-Driven Innovation", defaultControls: 9 },
  { key: "P3", pillarId: "human-centric-use", number: 3, name: "Human-Centric Use", defaultControls: 9 },
  { key: "P4", pillarId: "responsible-implementation", number: 4, name: "Responsible Implementation", defaultControls: 10 },
  { key: "P5", pillarId: "ai-literacy-workforce-readiness", number: 5, name: "AI Literacy & Workforce Readiness", defaultControls: 8 },
  { key: "P6", pillarId: "data-governance-integrity", number: 6, name: "Data Governance & Integrity", defaultControls: 10 },
  { key: "P7", pillarId: "transparency-auditability", number: 7, name: "Transparency & Auditability", defaultControls: 9 },
] as const;

function resolvePillarInfo(pillarId?: string, pillarNumber?: number) {
  if (pillarId === "ai-landscape" || pillarNumber === 0) {
    return { key: "P0", pillarId: "ai-landscape", number: 0, name: "Organization & AI Landscape" };
  }
  const byId = CANONICAL_GRAICE_PILLARS.find(
    (p) =>
      p.pillarId === pillarId ||
      p.key.toLowerCase() === (pillarId || "").toLowerCase() ||
      p.number === pillarNumber
  );
  return byId || CANONICAL_GRAICE_PILLARS[0];
}

/**
 * Admin Operational Dashboard Summary (Screen 7 Alignment)
 * Exposes high-level administrative numbers without any confidential assessment content.
 * - SuperAdmin: Platform-level tenant metadata only (no client organization or assessment access).
 * - TenantAdmin: Tenant-scoped client organizations, auditors, and assessment metadata.
 */
export async function getAdminDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== "SuperAdmin" && req.user?.role !== "TenantAdmin") {
      return sendError(res, "Access denied. Administrators only.", 403, "ADMIN_ROLE_REQUIRED");
    }

    const isSuperAdmin = req.user.role === "SuperAdmin";

    if (isSuperAdmin) {
      const [
        totalUsers,
        totalTenantAdmins,
        totalAuditors,
        totalTenants,
        activeTenants,
        pendingTenants,
        suspendedTenants,
        retiredTenants,
        frameworkCount,
        recentTenants,
        recentLogs,
      ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "TenantAdmin" }),
        User.countDocuments({ role: "Auditor" }),
        Tenant.countDocuments({}),
        Tenant.countDocuments({ status: "Active" }),
        Tenant.countDocuments({ status: "Pending" }),
        Tenant.countDocuments({ status: "Suspended" }),
        Tenant.countDocuments({ status: "Retired" }),
        AssessmentFramework.distinct("version").then((v) => v.length),
        Tenant.find({}).sort({ createdAt: -1 }).limit(5),
        AuditLog.find({ action: { $ne: "AUTHORIZATION_DENIED" }, entity: { $in: ["Tenant", "User", "AssessmentFramework"] } })
          .sort({ timestamp: -1 })
          .limit(6),
      ]);

      const recentTenantsWithStats = await Promise.all(
        recentTenants.map(async (tenant) => {
          const userCount = await TenantMembership.countDocuments({
            tenantId: tenant._id,
            status: "Active",
          });
          return {
            _id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
            userCount,
            createdAt: tenant.createdAt,
          };
        })
      );

      const recentActivity = recentLogs.map((log) => ({
        id: log._id,
        title: log.action.replace(/_/g, " "),
        description: `${log.actorEmail} performed ${log.action} on ${log.entity}`,
        type: log.action,
        timestamp: log.timestamp,
      }));

      return sendSuccess(res, {
        stats: {
          totalUsers,
          totalTenantAdmins,
          totalAuditors,
          totalTenants,
          totalOrganizations: totalTenants,
          totalAssessments: 0,
          frameworkVersions: frameworkCount || 1,
          pillarsCount: 7,
          controlsCount: 65,
          questionsCount: 95,
          evidenceItemsCount: 0,
          reportsCount: 0,
          activeSubscriptions: activeTenants,
          permissionRolesCount: 3,
        },
        tenantsByStatus: {
          total: totalTenants,
          active: activeTenants,
          pending: pendingTenants,
          suspended: suspendedTenants,
          retired: retiredTenants,
        },
        assessmentsByStatus: {
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0,
          overdue: 0,
        },
        subscriptionDistribution: {
          total: totalTenants,
          bronze: 0,
          silver: 0,
          gold: 0,
        },
        recentTenants: recentTenantsWithStats,
        recentOrganizations: recentTenantsWithStats,
        recentActivity,
      });
    }

    // TenantAdmin view: strictly scoped to their tenant
    const tenantId = req.user.tenantId;
    const companyId = req.user.companyId;
    const orgFilter: Record<string, any> = tenantId ? { tenantId } : { _id: companyId };
    const sessionFilter: Record<string, any> = tenantId ? { tenantId } : { companyId };

    const [
      totalUsers,
      totalAuditors,
      totalOrganizations,
      totalAssessments,
      submittedCount,
      inProgressCount,
      frameworkCount,
      companies,
      recentLogs,
    ] = await Promise.all([
      tenantId
        ? TenantMembership.countDocuments({ tenantId, status: "Active" })
        : User.countDocuments({ companyId }),
      tenantId
        ? TenantMembership.countDocuments({ tenantId, role: "Auditor", status: "Active" })
        : User.countDocuments({ companyId, role: "Auditor" }),
      Company.countDocuments(orgFilter),
      AssessmentSession.countDocuments(sessionFilter),
      AssessmentSession.countDocuments({ ...sessionFilter, status: "Submitted" }),
      AssessmentSession.countDocuments({ ...sessionFilter, status: "InProgress" }),
      AssessmentFramework.distinct("version").then((v) => v.length),
      Company.find(orgFilter).sort({ createdAt: -1 }).limit(5),
      AuditLog.find(tenantId ? { tenantId } : { actorId: req.user.userId })
        .sort({ timestamp: -1 })
        .limit(6),
    ]);

    // Plan distributions
    const [bronzeCount, silverCount, goldCount] = await Promise.all([
      Company.countDocuments({ ...orgFilter, $or: [{ activePlan: "Bronze" }, { activePlan: { $exists: false } }] }),
      Company.countDocuments({ ...orgFilter, activePlan: "Silver" }),
      Company.countDocuments({ ...orgFilter, activePlan: "Gold" }),
    ]);

    // Assessment count by company for recent organizations widget
    const recentOrgsWithStats = await Promise.all(
      companies.map(async (comp) => {
        const assessCount = await AssessmentSession.countDocuments({ companyId: comp._id });
        return {
          _id: comp._id,
          name: comp.name,
          activePlan: comp.activePlan || "Bronze",
          assessmentCount: assessCount,
          userCount: totalAuditors,
          status: comp.status,
          createdAt: comp.createdAt,
        };
      })
    );

    // Formatted non-confidential activity stream
    const recentActivity = recentLogs.map((log) => ({
      id: log._id,
      title: log.action.replace(/_/g, " "),
      description: `${log.actorEmail} performed ${log.action} on ${log.entity}`,
      type: log.action,
      timestamp: log.timestamp,
    }));

    return sendSuccess(res, {
      stats: {
        totalUsers,
        totalAuditors,
        totalOrganizations,
        totalAssessments,
        frameworkVersions: frameworkCount || 1,
        pillarsCount: 7,
        controlsCount: 65,
        questionsCount: 95,
        evidenceItemsCount: await AssessmentSession.countDocuments({
          ...sessionFilter,
          "answers.evidenceAttachmentUrl": { $exists: true, $ne: "" },
        }),
        reportsCount: await AssessmentSession.countDocuments({
          ...sessionFilter,
          reportMetadata: { $exists: true },
        }),
        activeSubscriptions: bronzeCount + silverCount + goldCount,
        permissionRolesCount: 3,
      },
      assessmentsByStatus: {
        total: totalAssessments,
        completed: submittedCount,
        inProgress: inProgressCount,
        notStarted: Math.max(0, totalAssessments - (submittedCount + inProgressCount)),
        overdue: 0,
      },
      subscriptionDistribution: {
        total: totalOrganizations,
        bronze: bronzeCount,
        silver: silverCount,
        gold: goldCount,
      },
      recentOrganizations: recentOrgsWithStats,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin Filterable Assessment Metadata Table (Screen 7 Alignment)
 * Strictly excludes answers, scores, and evidence URLs.
 * SuperAdmin is blocked from viewing tenant assessment metadata/records.
 */
export async function getAdminDashboardAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== "SuperAdmin" && req.user?.role !== "TenantAdmin") {
      return sendError(res, "Access denied. Administrators only.", 403, "ADMIN_ROLE_REQUIRED");
    }

    if (req.user?.role === "SuperAdmin") {
      return sendError(
        res,
        "SuperAdmin sees tenant metadata only and cannot access tenant assessment records.",
        403,
        "SUPER_ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const { status, search, assessmentType } = req.query as {
      status?: string;
      search?: string;
      assessmentType?: string;
    };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    // TenantAdmins are strictly scoped to their own tenant
    if (req.user?.tenantId) {
      query.tenantId = req.user.tenantId;
    } else if (req.user?.companyId) {
      query.companyId = req.user.companyId;
    }

    if (status && status !== "all") {
      query.status = status;
    }
    if (assessmentType && assessmentType !== "all") {
      query.assessmentType = assessmentType;
    }

    if (search) {
      const companyFilter: Record<string, any> = {
        name: { $regex: search, $options: "i" },
      };
      if (req.user?.tenantId) {
        companyFilter.tenantId = req.user.tenantId;
      }
      const matchingCompanies = await Company.find(companyFilter).select("_id");
      const companyIds = matchingCompanies.map((c) => c._id);
      query.companyId = { $in: companyIds };
    }

    const [total, sessions] = await Promise.all([
      AssessmentSession.countDocuments(query),
      AssessmentSession.find(query)
        .select("-answers -scoreSnapshot") // Critical: Strip all confidential content
        .populate("companyId", "name domain industry country activePlan")
        .populate("conductedByUserId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const formattedSessions = sessions.map((s) => ({
      _id: s._id,
      organization: s.companyId,
      auditor: s.conductedByUserId,
      assessmentType: s.assessmentType,
      status: s.status,
      clientContact: s.clientContact,
      frameworkVersion: s.frameworkVersion,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      submittedAt: s.submittedAt,
    }));

    return sendSuccess(
      res,
      {
        assessments: formattedSessions,
      },
      200,
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Auditor Workload Dashboard Summary (Screen 1 Alignment)
 * Exposes active client stats, overall progress %, 7-pillar bars, and resumption cards.
 */
export async function getAuditorDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const auditorId = req.user?.userId;
    if (!auditorId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const assignedOrgIds = await getAssignedOrganizationIds(auditorId, req.user?.tenantId);

    const sessionQuery: Record<string, any> = {
      $or: [
        { conductedByUserId: auditorId },
        { createdByUserId: auditorId },
        { "sharedWith.auditorId": auditorId },
      ],
    };

    if (req.user?.tenantId) {
      sessionQuery.tenantId = req.user.tenantId;
    }

    const [allSessions, assignedCompanies] = await Promise.all([
      AssessmentSession.find(sessionQuery).populate("companyId", "name domain industry status activePlan"),
      Company.find({ _id: { $in: assignedOrgIds } }),
    ]);

    const totalAssessments = allSessions.length;
    const inProgressSessions = allSessions.filter((s) => s.status === "InProgress");
    const completedSessions = allSessions.filter((s) => s.status === "Submitted");

    // Findings count (exceptions noted)
    let totalFindings = 0;
    const latestFindings: any[] = [];

    allSessions.forEach((s) => {
      const compName = (s.companyId as any)?.name || "Organization";
      s.answers?.forEach((a) => {
        if (a.exceptionStatus === "ExceptionNoted" || a.selectedOptionCode === "EXCEPTION_NOTED") {
          totalFindings++;
          if (latestFindings.length < 5) {
            latestFindings.push({
              findingId: `FND-${new Date(a.answeredAt).getFullYear()}-${String(latestFindings.length + 1).padStart(3, "0")}`,
              controlId: a.questionId,
              title: a.evidenceNotes ? a.evidenceNotes.slice(0, 50) : `Exception noted for control ${a.questionId}`,
              organizationName: compName,
              severity: a.scoreValue && a.scoreValue > 0 ? "Medium" : "High",
              status: "Open",
            });
          }
        }
      });
    });

    // 7 GRAICE Pillars aggregate performance (aligned with official GRAICE Pillars 1-7)
    const pillarTotals: Record<
      string,
      { pillarId: string; name: string; number: number; complete: number; total: number }
    > = {};

    for (const p of CANONICAL_GRAICE_PILLARS) {
      pillarTotals[p.key] = {
        pillarId: p.pillarId,
        name: p.name,
        number: p.number,
        complete: 0,
        total: 0,
      };
    }

    allSessions.forEach((s) => {
      s.answers?.forEach((a) => {
        if (a.pillarId === "ai-landscape" || a.pillarNumber === 0) {
          return; // Section 1 context questions are tracked separately from the 7 Pillars
        }
        const matchedPillar = CANONICAL_GRAICE_PILLARS.find(
          (p) =>
            p.pillarId === a.pillarId ||
            p.key.toLowerCase() === (a.pillarId || "").toLowerCase() ||
            p.number === a.pillarNumber
        );
        if (matchedPillar) {
          const bucket = pillarTotals[matchedPillar.key];
          bucket.total++;
          const isAnswered =
            a.testStatus === "Complete" ||
            !!a.selectedOptionCode ||
            (typeof a.scoreValue === "number" && a.scoreValue > 0) ||
            a.exceptionStatus === "NoExceptionNoted" ||
            a.exceptionStatus === "ExceptionNoted";
          if (isAnswered) {
            bucket.complete++;
          }
        }
      });
    });

    const pillarPerformance = CANONICAL_GRAICE_PILLARS.map((p) => {
      const data = pillarTotals[p.key];
      const pct = data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0;
      return {
        pillarId: p.key,
        canonicalPillarId: p.pillarId,
        pillarNumber: data.number,
        name: data.name,
        completionPercentage: pct,
      };
    });

    // Overall completion percentage
    const avgCompletion =
      totalAssessments > 0
        ? Math.round((completedSessions.length / totalAssessments) * 100)
        : 0;

    // Full vs Light split
    const fullCount = allSessions.filter((s) => s.assessmentType === "Full").length;
    const lightCount = allSessions.filter((s) => s.assessmentType === "Light").length;

    // Resumption Cards ("Continue Your Assessment")
    const activeAssessments = inProgressSessions.slice(0, 3).map((s) => {
      const answeredCount =
        s.answers?.filter(
          (a) => a.testStatus === "Complete" || !!a.selectedOptionCode
        ).length || 0;
      const totalCount =
        s.answers?.length || (s.assessmentType === "Full" ? 65 : 30);
      const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

      const nextUnanswered =
        s.answers?.find(
          (a) => a.testStatus !== "Complete" && !a.selectedOptionCode
        ) || s.answers?.[s.answers.length - 1];
      const resolvedPillar = resolvePillarInfo(
        nextUnanswered?.pillarId,
        nextUnanswered?.pillarNumber
      );

      return {
        _id: s._id,
        organizationName: (s.companyId as any)?.name || "Assigned Company",
        assessmentType: s.assessmentType,
        completionPercentage: pct,
        resumptionAid: {
          currentPillarId: resolvedPillar.pillarId,
          currentPillarName: resolvedPillar.name,
          currentQuestionIndex: answeredCount,
        },
      };
    });

    return sendSuccess(res, {
      stats: {
        totalAssessments,
        inProgressAssessments: inProgressSessions.length,
        completedAssessments: completedSessions.length,
        totalFindings,
        assignedOrganizations: assignedCompanies.length,
      },
      overallCompletionPercentage: avgCompletion,
      pillarPerformance,
      assessmentTypes: {
        total: totalAssessments,
        fullCount,
        fullPercentage: totalAssessments > 0 ? Math.round((fullCount / totalAssessments) * 100) : 0,
        lightCount,
        lightPercentage: totalAssessments > 0 ? Math.round((lightCount / totalAssessments) * 100) : 0,
      },
      myOrganizations: assignedCompanies.slice(0, 5).map((c) => ({
        _id: c._id,
        name: c.name,
        industry: c.industry || "General",
        status: c.status,
        assessmentCount: allSessions.filter((s) => s.companyId?.toString() === c._id.toString()).length,
      })),
      latestFindings,
      activeAssessments,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Auditor Assessment Listing with Status Filter & Deep-Linking Aid
 */
export async function getAuditorDashboardAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const auditorId = req.user?.userId;
    if (!auditorId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const { status, organizationId, assessmentType } = req.query as {
      status?: string;
      organizationId?: string;
      assessmentType?: string;
    };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [
        { conductedByUserId: auditorId },
        { createdByUserId: auditorId },
        { "sharedWith.auditorId": auditorId },
      ],
    };

    if (req.user?.tenantId) {
      query.tenantId = req.user.tenantId;
    }

    if (status && status !== "all") {
      query.status = status;
    }
    if (organizationId) {
      query.companyId = organizationId;
    }
    if (assessmentType && assessmentType !== "all") {
      query.assessmentType = assessmentType;
    }

    const [total, sessions] = await Promise.all([
      AssessmentSession.countDocuments(query),
      AssessmentSession.find(query)
        .populate("companyId", "name domain industry country activePlan")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const formatted = sessions.map((s) => {
      const answeredCount =
        s.answers?.filter(
          (a) => a.testStatus === "Complete" || !!a.selectedOptionCode
        ).length || 0;
      const totalCount =
        s.answers?.length || (s.assessmentType === "Full" ? 65 : 30);
      const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

      const nextUnanswered =
        s.answers?.find(
          (a) => a.testStatus !== "Complete" && !a.selectedOptionCode
        ) || s.answers?.[s.answers.length - 1];
      const resolvedPillar = resolvePillarInfo(
        nextUnanswered?.pillarId,
        nextUnanswered?.pillarNumber
      );

      return {
        _id: s._id,
        organization: s.companyId,
        assessmentType: s.assessmentType,
        status: s.status,
        completionPercentage: pct,
        clientContact: s.clientContact,
        scoreSnapshot: s.scoreSnapshot,
        resumptionAid: {
          currentQuestionIndex: answeredCount,
          currentPillarId: resolvedPillar.pillarId,
          currentPillarName: resolvedPillar.name,
        },
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        submittedAt: s.submittedAt,
      };
    });

    return sendSuccess(
      res,
      { assessments: formatted },
      200,
      { page, limit, total, totalPages: Math.ceil(total / limit) }
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Auditor Accessible Organizations Directory (Screen 2 Alignment)
 * Returns companies assigned to the auditor with active assessment statistics and drawer metadata.
 */
export async function getAuditorOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const auditorId = req.user?.userId;
    if (!auditorId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const assignedOrgIds = await getAssignedOrganizationIds(auditorId, req.user?.tenantId);
    const companies = await Company.find({ _id: { $in: assignedOrgIds } }).sort({ name: 1 });

    const auditorVisibilityFilter = {
      $or: [
        { conductedByUserId: auditorId },
        { createdByUserId: auditorId },
        { "sharedWith.auditorId": auditorId },
      ],
    };

    const organizationsWithStats = await Promise.all(
      companies.map(async (c) => {
        const baseFilter = { companyId: c._id, ...auditorVisibilityFilter };
        const [total, inProgress, completed, latest] = await Promise.all([
          AssessmentSession.countDocuments(baseFilter),
          AssessmentSession.countDocuments({ ...baseFilter, status: "InProgress" }),
          AssessmentSession.countDocuments({ ...baseFilter, status: "Submitted" }),
          AssessmentSession.findOne(baseFilter).sort({ createdAt: -1 }),
        ]);

        return {
          _id: c._id,
          name: c.name,
          domain: c.domain,
          industry: c.industry || "General",
          country: c.country,
          status: c.status,
          activePlan: c.activePlan || "Bronze",
          size: c.size || "100-500 employees",
          assessmentsSummary: {
            total,
            inProgress,
            completed,
            notStarted: Math.max(0, total - (inProgress + completed)),
          },
          latestAssessment: latest
            ? {
                _id: latest._id,
                assessmentType: latest.assessmentType,
                status: latest.status,
                createdAt: latest.createdAt,
                completionPercentage: Math.round(
                  ((latest.answers?.filter(
                    (a) => a.testStatus === "Complete" || !!a.selectedOptionCode
                  ).length || 0) /
                    (latest.answers?.length ||
                      (latest.assessmentType === "Full" ? 65 : 30))) *
                    100
                ),
              }
            : null,
        };
      })
    );

    return sendSuccess(res, { organizations: organizationsWithStats });
  } catch (err) {
    next(err);
  }
}
