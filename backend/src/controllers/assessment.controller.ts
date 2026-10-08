import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import fs from "fs";
import { AssessmentSession, IAnswer } from "../models/AssessmentSession.js";
import { AssessmentFramework } from "../models/AssessmentFramework.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { ScoringService } from "../services/scoring.service.js";
import { s3Service } from "../services/s3.service.js";
import { ReportService } from "../services/report.service.js";
import { ExportService } from "../services/export.service.js";
import { scopeQueryByCompany, scopeQueryByCompanyAsync, isAuditorAssignedToOrg } from "../middlewares/companyScope.js";
import { NotificationService } from "../services/notification.service.js";

/**
 * Helper to record authorization-denied events in the audit log
 */
export async function logAuthorizationDenied(req: Request, entityId: string, reason: string) {
  try {
    if (req.user?.userId) {
      await AuditLog.create({
        actorId: req.user.userId,
        actorEmail: req.user.email || "unknown",
        action: "AUTHORIZATION_DENIED",
        entity: "AssessmentSession",
        entityId,
        before: { reason },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
    }
  } catch (err) {
    console.error("Failed to log authorization denial audit record:", err);
  }
}

/**
 * Initialize a new assessment session
 */
export async function createAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId, assessmentType, frameworkVersion, clientContact } = req.body;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    const actorId = req.user.userId;
    const actorEmail = req.user.email || "unknown";

    // Tenant isolation: Assessors can only create sessions for assigned organizations
    if (req.user.role !== "Admin") {
      const isAssigned = await isAuditorAssignedToOrg(actorId, companyId);
      if (!isAssigned) {
        return sendError(
          res,
          "You are not assigned to conduct an assessment for this organization.",
          403,
          "CROSS_COMPANY_ACCESS_DENIED"
        );
      }
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return sendError(res, "Company not found", 404, "COMPANY_NOT_FOUND");
    }

    // Resolve published framework
    const query: Record<string, any> = {
      assessmentType,
      status: "Published",
    };
    if (frameworkVersion) {
      query.version = frameworkVersion;
    }

    const framework = await AssessmentFramework.findOne(query).sort({ createdAt: -1 });
    if (!framework) {
      return sendError(
        res,
        `No published ${assessmentType} Assessment Framework found.`,
        404,
        "FRAMEWORK_NOT_FOUND"
      );
    }

    // Pre-populate empty answers for all controls in framework
    const initialAnswers: IAnswer[] = framework.questions.map((q) => ({
      questionId: q.questionId,
      pillarId: q.pillarId,
      pillarNumber: q.pillarNumber,
      testStatus: "NotStarted",
      exceptionStatus: "NotAssessed",
      scoreValue: 0,
      answeredAt: new Date(),
    }));

    const session = await AssessmentSession.create({
      companyId: new Types.ObjectId(companyId),
      conductedByUserId: new Types.ObjectId(actorId),
      frameworkVersion: framework.version,
      assessmentType,
      status: "InProgress",
      clientContact,
      answers: initialAnswers,
    });

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "ASSESSMENT_SESSION_CREATED",
      entity: "AssessmentSession",
      entityId: session._id.toString(),
      after: {
        companyId,
        assessmentType,
        frameworkVersion: framework.version,
        clientContact,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      {
        session,
        frameworkInfo: {
          title: framework.title,
          version: framework.version,
          totalQuestions: framework.questions.length,
          pillarsCount: framework.pillars.length,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * Get assessment session by ID (Save & Resume)
 */
export async function getAssessmentById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    const session = await AssessmentSession.findById(id)
      .populate("companyId", "name domain verificationStatus status")
      .populate("conductedByUserId", "name email role");

    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    // RULE 1: Admin is strictly prohibited from accessing confidential assessment content
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to confidential assessment content (answers, findings, evidence) is restricted."
      );

      return sendError(
        res,
        "Administrative access to confidential assessment content, answers, and findings is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId =
      (session.companyId as any)?._id?.toString() || session.companyId?.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);

    const isCreator =
      (session.conductedByUserId as any)?._id?.toString() === req.user.userId ||
      session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(
        res,
        "Access denied. You do not have permission to view assessments for this organization.",
        403,
        "CROSS_COMPANY_ACCESS_DENIED"
      );
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });

    return sendSuccess(res, {
      session,
      framework: framework
        ? {
            title: framework.title,
            version: framework.version,
            pillars: framework.pillars,
            questions: framework.questions,
            maturityThresholds: framework.maturityThresholds,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List assessment sessions with scoping and pagination
 */
export async function getAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const baseFilter: Record<string, any> = {};

    if (req.query.status && typeof req.query.status === "string") {
      baseFilter.status = req.query.status;
    }
    if (req.query.assessmentType && typeof req.query.assessmentType === "string") {
      baseFilter.assessmentType = req.query.assessmentType;
    }
    if (req.query.companyId && typeof req.query.companyId === "string") {
      baseFilter.companyId = req.query.companyId;
    }

    const scopedFilter = await scopeQueryByCompanyAsync(req, baseFilter, "companyId");

    const [sessions, total] = await Promise.all([
      AssessmentSession.find(scopedFilter)
        .select("-answers")
        .populate("companyId", "name domain verificationStatus status")
        .populate("conductedByUserId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AssessmentSession.countDocuments(scopedFilter),
    ]);

    return sendSuccess(res, sessions, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save/update answer(s) (Single or Batch)
 */
export async function saveAnswers(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    const actorId = req.user.userId;

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    if (session.status === "Submitted") {
      return sendError(
        res,
        "This assessment has already been finalized and submitted. Answers are locked.",
        400,
        "ASSESSMENT_ALREADY_SUBMITTED"
      );
    }

    // RULE 1: Admin is strictly prohibited from modifying assessment answers
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to modify assessment answers is restricted."
      );
      return sendError(
        res,
        "Administrative access to modify confidential assessment answers is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(
        res,
        "Access denied. You do not have permission to modify this assessment.",
        403,
        "CROSS_COMPANY_ACCESS_DENIED"
      );
    }

    // Merge answers into existing map
    const existingMap = new Map(session.answers.map((a) => [a.questionId, a]));

    for (const newAns of answers) {
      const current = existingMap.get(newAns.questionId);
      const updated: IAnswer = {
        questionId: newAns.questionId,
        pillarId: newAns.pillarId || current?.pillarId || "",
        pillarNumber: current?.pillarNumber,
        testStatus: newAns.testStatus || current?.testStatus || "Complete",
        exceptionStatus: newAns.exceptionStatus || current?.exceptionStatus || "NotAssessed",
        selectedOptionCode: newAns.selectedOptionCode || current?.selectedOptionCode,
        scoreValue: typeof newAns.scoreValue === "number" ? newAns.scoreValue : current?.scoreValue || 0,
        workPaperReference: newAns.workPaperReference ?? current?.workPaperReference,
        evidenceNotes: newAns.evidenceNotes ?? current?.evidenceNotes,
        evidenceAttachmentUrl: newAns.evidenceAttachmentUrl ?? current?.evidenceAttachmentUrl,
        s3Key: newAns.s3Key ?? current?.s3Key,
        testedByUserId: actorId ? new Types.ObjectId(actorId) : undefined,
        answeredAt: new Date(),
      };
      existingMap.set(newAns.questionId, updated);
    }

    session.answers = Array.from(existingMap.values());
    await session.save();

    return sendSuccess(res, {
      message: "Answers saved successfully",
      savedCount: answers.length,
      totalAnswered: session.answers.filter(
        (a) => a.testStatus === "Complete" || !!a.selectedOptionCode
      ).length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Calculate real-time progress for an assessment session
 */
export async function getAssessmentProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    if (
      req.user?.role !== "Admin" &&
      session.companyId.toString() !== req.user?.companyId?.toString()
    ) {
      return sendError(res, "Access denied.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));

    const pillarProgress = framework.pillars.map((p) => {
      const questions = framework.questions.filter((q) => q.pillarId === p.pillarId);
      let complete = 0;
      let inProgress = 0;
      let notStarted = 0;
      let exceptionsNoted = 0;
      let noExceptions = 0;

      for (const q of questions) {
        const a = answerMap.get(q.questionId);
        if (!a || a.testStatus === "NotStarted" || (!a.testStatus && !a.selectedOptionCode)) {
          notStarted++;
        } else if (a.testStatus === "InProgress") {
          inProgress++;
        } else {
          complete++;
          if (a.exceptionStatus === "ExceptionNoted") exceptionsNoted++;
          if (a.exceptionStatus === "NoExceptionNoted") noExceptions++;
        }
      }

      const total = questions.length;
      const completionPercentage = total > 0 ? Math.round((complete / total) * 100 * 10) / 10 : 0;

      return {
        pillarId: p.pillarId,
        pillarName: p.name,
        pillarNumber: p.pillarNumber,
        total,
        complete,
        inProgress,
        notStarted,
        exceptionsNoted,
        noExceptions,
        completionPercentage,
      };
    });

    const totalQuestions = framework.questions.length;
    const totalComplete = pillarProgress.reduce((s, p) => s + p.complete, 0);
    const overallCompletion =
      totalQuestions > 0 ? Math.round((totalComplete / totalQuestions) * 100 * 10) / 10 : 0;

    return sendSuccess(res, {
      assessmentId: session._id,
      assessmentType: session.assessmentType,
      status: session.status,
      totalQuestions,
      completedQuestions: totalComplete,
      overallCompletionPercentage: overallCompletion,
      pillarBreakdown: pillarProgress,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Finalize & submit assessment session, locking answers and computing scores
 */
export async function submitAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }
    const actorId = req.user.userId;
    const actorEmail = req.user.email || "unknown";

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    if (session.status === "Submitted") {
      return sendError(res, "Assessment is already submitted.", 400, "ALREADY_SUBMITTED");
    }

    // RULE 1: Admin is strictly prohibited from submitting assessments
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to submit or finalize assessments is restricted."
      );
      return sendError(
        res,
        "Administrative access to submit or finalize assessments is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    // Compute deterministic score snapshot
    const scoreSnapshot = ScoringService.calculateScores(session, framework);

    session.status = "Submitted";
    session.scoreSnapshot = scoreSnapshot;
    session.submittedAt = new Date();
    await session.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "ASSESSMENT_SUBMITTED",
      entity: "AssessmentSession",
      entityId: session._id.toString(),
      after: {
        overallScore: scoreSnapshot.overallScore,
        maturityLevel: scoreSnapshot.maturityLevel,
        overallPercentage: scoreSnapshot.overallPercentage,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Assessment submitted and finalized successfully. Scores locked.",
      session,
      scoreSnapshot,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate S3 presigned upload URL for evidence
 */
export async function getEvidencePresignedUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { questionId, fileName, contentType } = req.body;

    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    // RULE 1: Admin is strictly prohibited from generating evidence URLs
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to assessment evidence presigned URL is restricted."
      );
      return sendError(
        res,
        "Administrative access to confidential assessment evidence is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const result = await s3Service.getPresignedUploadUrl(
      session.companyId.toString(),
      session._id.toString(),
      questionId,
      fileName,
      contentType
    );

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * Direct file upload handler (Multi-part upload with S3 storage)
 */
export async function uploadEvidenceDirect(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const questionId = req.body.questionId;
    const file = req.file;

    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (!file) {
      return sendError(res, "No file provided for upload", 400, "FILE_REQUIRED");
    }
    if (!questionId) {
      return sendError(res, "questionId is required in form body", 400, "QUESTION_ID_REQUIRED");
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    // RULE 1: Admin is strictly prohibited from uploading assessment evidence
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to upload assessment evidence is restricted."
      );
      return sendError(
        res,
        "Administrative access to confidential assessment evidence is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const uploadResult = await s3Service.uploadFileBuffer(
      file.buffer,
      session.companyId.toString(),
      session._id.toString(),
      questionId,
      file.originalname,
      file.mimetype
    );

    // Automatically link to answer in session
    const answer = session.answers.find((a) => a.questionId === questionId);
    if (answer) {
      answer.evidenceAttachmentUrl = uploadResult.fileUrl;
      answer.s3Key = uploadResult.s3Key;
      await session.save();
    }

    return sendSuccess(res, {
      message: "Evidence file uploaded successfully to S3 storage",
      upload: uploadResult,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List historical assessments for a company
 */
export async function getCompanyAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.params.companyId || req.params.id;

    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role !== "Admin") {
      const isAssigned = await isAuditorAssignedToOrg(req.user.userId, companyId);
      if (!isAssigned) {
        return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
      }
    }

    const sessions = await AssessmentSession.find({ companyId })
      .populate("conductedByUserId", "name email")
      .sort({ createdAt: -1 });

    return sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve governance gaps for an assessment
 */
export async function getAssessmentGaps(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    // RULE 1: Admin is strictly prohibited from accessing confidential gap analysis
    if (req.user?.role === "Admin") {
      await logAuthorizationDenied(
        req,
        id,
        "Admin access to confidential assessment gaps and findings is restricted."
      );
      return sendError(
        res,
        "Administrative access to confidential assessment findings and gaps is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    // RULE 2: Auditor must be assigned to this assessment's organization
    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const gaps = ScoringService.extractGaps(session, framework);

    return sendSuccess(res, {
      assessmentId: session._id,
      assessmentType: session.assessmentType,
      totalGapsIdentified: gaps.length,
      gaps,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve executive maturity summary for an assessment
 */
export async function getAssessmentSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to assessment summary is restricted.");
      return sendError(
        res,
        "Administrative access to confidential assessment summary is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id).populate("companyId", "name domain");
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId._id ? session.companyId._id.toString() : session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const snapshot = session.scoreSnapshot || ScoringService.calculateScores(session, framework);

    return sendSuccess(res, {
      assessmentId: session._id,
      organization: session.companyId,
      assessmentType: session.assessmentType,
      status: session.status,
      frameworkVersion: session.frameworkVersion,
      clientContact: session.clientContact,
      overallScore: snapshot.overallScore,
      maxPossibleScore: snapshot.maxPossibleScore,
      overallPercentage: snapshot.overallPercentage,
      compliancePercentage: snapshot.compliancePercentage,
      maturityLevel: snapshot.maturityLevel,
      totalExceptionsNoted: snapshot.totalExceptionsNoted || 0,
      totalNoExceptionsNoted: snapshot.totalNoExceptionsNoted || 0,
      totalNotAssessed: snapshot.totalNotAssessed || 0,
      totalControlsAssessed: snapshot.totalControlsAssessed || snapshot.overallScore,
      submittedAt: session.submittedAt,
      calculatedAt: snapshot.calculatedAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve 7-pillar breakdown formatted for radar/spider charts (Screen 1 & 3 Alignment)
 */
export async function getAssessmentPillars(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to assessment pillar radar breakdown is restricted.");
      return sendError(
        res,
        "Administrative access to confidential assessment pillar data is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const snapshot = session.scoreSnapshot || ScoringService.calculateScores(session, framework);

    return sendSuccess(res, {
      assessmentId: session._id,
      assessmentType: session.assessmentType,
      maturityLevel: snapshot.maturityLevel,
      pillars: snapshot.pillarScores.map((p) => ({
        pillarId: p.pillarId,
        pillarNumber: p.pillarNumber,
        pillarName: p.pillarName,
        scoreEarned: p.scoreEarned,
        scoreMax: p.scoreMax,
        percentage: p.percentage,
        compliancePercentage: p.compliancePercentage,
        exceptionsNoted: p.exceptionsNoted || 0,
        noExceptionsNoted: p.noExceptionsNoted || 0,
        notAssessed: p.notAssessed || 0,
        totalControls: p.totalControls || p.scoreMax,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve tailored recommendations mapped to identified exceptions & gaps
 */
export async function getAssessmentRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to assessment recommendations is restricted.");
      return sendError(
        res,
        "Administrative access to confidential assessment recommendations is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const gaps = ScoringService.extractGaps(session, framework);

    const recommendations = gaps.map((g, idx) => ({
      recommendationId: `REC-${session._id.toString().slice(-4).toUpperCase()}-${idx + 1}`,
      questionId: g.questionId,
      pillarId: g.pillarId,
      pillarName: g.pillarName,
      controlText: g.questionText,
      priority: g.scoreValue === 0 ? "High" : "Medium",
      regulatoryAlignments: g.regulatoryAlignments,
      evidenceNotes: g.evidenceNotes,
      recommendedAction: `Formalize policy documentation and implement continuous operational controls for ${g.questionId} (${g.pillarName}) to remediate noted audit exception.`,
    }));

    return sendSuccess(res, {
      assessmentId: session._id,
      totalRecommendations: recommendations.length,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve detailed findings matching Screen 5 (Findings & Exceptions)
 */
export async function getAssessmentFindings(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to assessment findings is restricted.");
      return sendError(
        res,
        "Administrative access to confidential assessment findings is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id).populate("companyId", "name");
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId._id ? session.companyId._id.toString() : session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const framework = await AssessmentFramework.findOne({
      version: session.frameworkVersion,
      assessmentType: session.assessmentType,
    });
    if (!framework) {
      return sendError(res, "Framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const gaps = ScoringService.extractGaps(session, framework);
    const companyName = (session.companyId as any)?.name || "Organization";

    const findings = gaps.map((g, idx) => ({
      findingId: `FND-${new Date().getFullYear()}-${String(idx + 1).padStart(3, "0")}`,
      title: g.controlDescription || g.questionText.slice(0, 60),
      pillarId: g.pillarId,
      pillarName: g.pillarName,
      controlId: g.questionId,
      questionText: g.questionText,
      severity: g.scoreValue === 0 ? "High" : "Medium",
      status: "Open",
      organizationName: companyName,
      evidenceAttachmentUrl: session.answers.find((a) => a.questionId === g.questionId)?.evidenceAttachmentUrl,
      evidenceNotes: g.evidenceNotes,
      regulatoryAlignments: g.regulatoryAlignments,
      recommendedAction: `Establish formal governance documentation and review mechanisms for ${g.questionId}.`,
    }));

    return sendSuccess(res, {
      assessmentId: session._id,
      totalFindings: findings.length,
      summary: {
        total: findings.length,
        open: findings.filter((f) => f.status === "Open").length,
        inProgress: findings.filter((f) => f.status === "In Progress").length,
        resolved: findings.filter((f) => f.status === "Resolved").length,
      },
      findings,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Generate PDF audit report using PDFKit and attach metadata to session
 */
export async function generateAssessmentReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to generate assessment reports is restricted.");
      return sendError(
        res,
        "Administrative access to generate or download confidential assessment reports is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const [company, framework, auditor] = await Promise.all([
      Company.findById(session.companyId),
      AssessmentFramework.findOne({
        version: session.frameworkVersion,
        assessmentType: session.assessmentType,
      }),
      User.findById(req.user.userId),
    ]);

    if (!company || !framework || !auditor) {
      return sendError(res, "Required assessment context not found", 404, "CONTEXT_NOT_FOUND");
    }

    const reportResult = await ReportService.generateAssessmentReport(session, company, framework, auditor);

    session.reportMetadata = reportResult.metadata;
    await session.save();

    await AuditLog.create({
      actorId: req.user.userId,
      actorEmail: req.user.email || "unknown",
      action: "REPORT_GENERATED",
      entity: "AssessmentSession",
      entityId: session._id.toString(),
      after: {
        fileName: reportResult.metadata.fileName,
        checksum: reportResult.metadata.checksum,
        fileSizeBytes: reportResult.metadata.fileSizeBytes,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "PDF audit report generated successfully.",
      report: reportResult.metadata,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Download generated PDF audit report
 */
export async function downloadAssessmentReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to download assessment reports is restricted.");
      return sendError(
        res,
        "Administrative access to download confidential assessment reports is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    // If report already generated and exists on disk
    if (session.reportMetadata?.filePath && fs.existsSync(session.reportMetadata.filePath)) {
      return res.download(session.reportMetadata.filePath, session.reportMetadata.fileName);
    }

    // If not generated yet, generate on-demand
    const [company, framework, auditor] = await Promise.all([
      Company.findById(session.companyId),
      AssessmentFramework.findOne({
        version: session.frameworkVersion,
        assessmentType: session.assessmentType,
      }),
      User.findById(req.user.userId),
    ]);

    if (!company || !framework || !auditor) {
      return sendError(res, "Required assessment context not found", 404, "CONTEXT_NOT_FOUND");
    }

    const reportResult = await ReportService.generateAssessmentReport(session, company, framework, auditor);
    session.reportMetadata = reportResult.metadata;
    await session.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${reportResult.metadata.fileName}"`);
    return res.send(reportResult.buffer);
  } catch (err) {
    next(err);
  }
}

/**
 * Export assessment findings to Excel (.xlsx) workbook
 */
export async function exportAssessmentExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!req.user?.userId) {
      return sendError(res, "Authentication required", 401, "UNAUTHORIZED");
    }

    if (req.user.role === "Admin") {
      await logAuthorizationDenied(req, id, "Admin access to export assessment data is restricted.");
      return sendError(
        res,
        "Administrative access to export confidential assessment data is restricted.",
        403,
        "ADMIN_CONTENT_ACCESS_RESTRICTED"
      );
    }

    const session = await AssessmentSession.findById(id);
    if (!session) {
      return sendError(res, "Assessment session not found", 404, "SESSION_NOT_FOUND");
    }

    const orgId = session.companyId.toString();
    const isAssigned = await isAuditorAssignedToOrg(req.user.userId, orgId);
    const isCreator = session.conductedByUserId?.toString() === req.user.userId;

    if (!isAssigned && !isCreator) {
      return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
    }

    const [company, framework] = await Promise.all([
      Company.findById(session.companyId),
      AssessmentFramework.findOne({
        version: session.frameworkVersion,
        assessmentType: session.assessmentType,
      }),
    ]);

    if (!company || !framework) {
      return sendError(res, "Required assessment context not found", 404, "CONTEXT_NOT_FOUND");
    }

    const excelBuffer = ExportService.generateAssessmentExcel(session, company, framework);
    const fileName = `GRAICE_Audit_Findings_${company.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${session._id}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(excelBuffer);
  } catch (err) {
    next(err);
  }
}

