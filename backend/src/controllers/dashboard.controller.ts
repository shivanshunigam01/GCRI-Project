import { Request, Response, NextFunction } from "express";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { AssessmentFramework } from "../models/AssessmentFramework.js";
import { AuditorOrganization } from "../models/AuditorOrganization.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { getAssignedOrganizationIds, isAuditorAssignedToOrg } from "../middlewares/companyScope.js";
import { logAuthorizationDenied } from "./assessment.controller.js";

/**
 * Admin Operational Dashboard Summary (Screen 7 Alignment)
 * Exposes high-level administrative numbers without any confidential assessment content.
 */
export async function getAdminDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== "Admin") {
      return sendError(res, "Access denied. Platform administrators only.", 403, "ADMIN_ROLE_REQUIRED");
    }

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
      User.countDocuments(),
      User.countDocuments({ role: "Assessor" }),
      Company.countDocuments(),
      AssessmentSession.countDocuments(),
      AssessmentSession.countDocuments({ status: "Submitted" }),
      AssessmentSession.countDocuments({ status: "InProgress" }),
      AssessmentFramework.distinct("version").then((v) => v.length),
      Company.find().sort({ createdAt: -1 }).limit(5),
      AuditLog.find({ action: { $ne: "AUTHORIZATION_DENIED" } })
        .sort({ timestamp: -1 })
        .limit(6),
    ]);

    // Plan distributions
    const [bronzeCount, silverCount, goldCount] = await Promise.all([
      Company.countDocuments({ $or: [{ activePlan: "Bronze" }, { activePlan: { $exists: false } }] }),
      Company.countDocuments({ activePlan: "Silver" }),
      Company.countDocuments({ activePlan: "Gold" }),
    ]);

    // Assessment count by company for recent organizations widget
    const recentOrgsWithStats = await Promise.all(
      companies.map(async (comp) => {
        const [assessCount, userCount] = await Promise.all([
          AssessmentSession.countDocuments({ companyId: comp._id }),
          User.countDocuments({ companyId: comp._id }),
        ]);
        return {
          _id: comp._id,
          name: comp.name,
          activePlan: comp.activePlan || "Bronze",
          assessmentCount: assessCount,
          userCount,
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
        evidenceItemsCount: await AssessmentSession.countDocuments({ "answers.evidenceAttachmentUrl": { $exists: true, $ne: "" } }),
        reportsCount: await AssessmentSession.countDocuments({ reportMetadata: { $exists: true } }),
        activeSubscriptions: bronzeCount + silverCount + goldCount,
        permissionRolesCount: 2,
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
 */
export async function getAdminDashboardAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user?.role !== "Admin") {
      return sendError(res, "Access denied. Platform administrators only.", 403, "ADMIN_ROLE_REQUIRED");
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

    if (status && status !== "all") {
      query.status = status;
    }
    if (assessmentType && assessmentType !== "all") {
      query.assessmentType = assessmentType;
    }

    if (search) {
      const matchingCompanies = await Company.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");
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

    const assignedOrgIds = await getAssignedOrganizationIds(auditorId);

    const sessionQuery = {
      $or: [
        { conductedByUserId: auditorId },
        { companyId: { $in: assignedOrgIds } },
      ],
    };

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
        if (a.exceptionStatus === "ExceptionNoted") {
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

    // 7 Pillars aggregate performance (for horizontal progress bars in Screen 1)
    const pillarTotals: Record<string, { name: string; number: number; complete: number; total: number }> = {
      P1: { name: "Ethical Leadership", number: 1, complete: 0, total: 10 },
      P2: { name: "Data Governance & Integrity", number: 2, complete: 0, total: 10 },
      P3: { name: "Purpose-Driven Innovation", number: 3, complete: 0, total: 10 },
      P4: { name: "Human-Centric Use", number: 4, complete: 0, total: 10 },
      P5: { name: "Responsible Implementation", number: 5, complete: 0, total: 10 },
      P6: { name: "AI Literacy & Workforce Readiness", number: 6, complete: 0, total: 10 },
      P7: { name: "Transparency & Auditability", number: 7, complete: 0, total: 10 },
    };

    allSessions.forEach((s) => {
      s.answers?.forEach((a) => {
        const pKey = a.pillarId || `P${a.pillarNumber || 1}`;
        if (pillarTotals[pKey]) {
          pillarTotals[pKey].total++;
          if (a.testStatus === "Complete" || (a.scoreValue && a.scoreValue > 0)) {
            pillarTotals[pKey].complete++;
          }
        }
      });
    });

    const pillarPerformance = Object.entries(pillarTotals).map(([pId, data]) => {
      const pct = data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0;
      return {
        pillarId: pId,
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
      const answeredCount = s.answers?.filter((a) => a.testStatus === "Complete").length || 0;
      const totalCount = s.assessmentType === "Full" ? 65 : 30;
      const pct = Math.round((answeredCount / totalCount) * 100);

      return {
        _id: s._id,
        organizationName: (s.companyId as any)?.name || "Assigned Company",
        assessmentType: s.assessmentType,
        completionPercentage: pct,
        resumptionAid: {
          currentPillarId: s.answers?.[s.answers.length - 1]?.pillarId || "P1",
          currentPillarName: "Ethical Leadership",
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

    const assignedOrgIds = await getAssignedOrganizationIds(auditorId);

    const query: any = {
      $or: [
        { conductedByUserId: auditorId },
        { companyId: { $in: assignedOrgIds } },
      ],
    };

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
      const answeredCount = s.answers?.filter((a) => a.testStatus === "Complete").length || 0;
      const totalCount = s.assessmentType === "Full" ? 65 : 30;
      const pct = Math.round((answeredCount / totalCount) * 100);

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
          currentPillarId: s.answers?.[s.answers.length - 1]?.pillarId || "P1",
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

    const assignedOrgIds = await getAssignedOrganizationIds(auditorId);
    const companies = await Company.find({ _id: { $in: assignedOrgIds } }).sort({ name: 1 });

    const organizationsWithStats = await Promise.all(
      companies.map(async (c) => {
        const [total, inProgress, completed, latest] = await Promise.all([
          AssessmentSession.countDocuments({ companyId: c._id }),
          AssessmentSession.countDocuments({ companyId: c._id, status: "InProgress" }),
          AssessmentSession.countDocuments({ companyId: c._id, status: "Submitted" }),
          AssessmentSession.findOne({ companyId: c._id }).sort({ createdAt: -1 }),
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
                  ((latest.answers?.filter((a) => a.testStatus === "Complete").length || 0) /
                    (latest.assessmentType === "Full" ? 65 : 30)) *
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
