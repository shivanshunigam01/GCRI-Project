import { Request, Response, NextFunction } from "express";
import {
  AssessmentFramework,
  IAssessmentFramework,
  IQuestionControl,
} from "../models/AssessmentFramework.js";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Helper to enforce the Milestone 5 Immutability Guardrail.
 * Returns true if editable, false if locked.
 */
async function checkFrameworkEditable(
  framework: IAssessmentFramework
): Promise<{ editable: boolean; reason?: string }> {
  if (framework.status !== "Draft") {
    return {
      editable: false,
      reason: `Framework is in '${framework.status}' status. Only 'Draft' versions can be modified. Create a new Draft version to introduce changes.`,
    };
  }

  const sessionCount = await AssessmentSession.countDocuments({
    frameworkVersion: framework.version,
    assessmentType: framework.assessmentType,
  });

  if (sessionCount > 0) {
    return {
      editable: false,
      reason: `Framework version '${framework.version}' is currently referenced by ${sessionCount} assessment session(s) and is locked from modification.`,
    };
  }

  return { editable: true };
}

/**
 * Create a new framework version (Draft)
 * Optionally clones from an existing published or draft version.
 */
export async function createFrameworkVersion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { version, assessmentType, title, description, cloneFromVersion } =
      req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    // Ensure version does not already exist for this assessmentType
    const existing = await AssessmentFramework.findOne({
      version,
      assessmentType,
    });
    if (existing) {
      return sendError(
        res,
        `Framework version '${version}' already exists for assessment type '${assessmentType}'`,
        409,
        "FRAMEWORK_VERSION_EXISTS"
      );
    }

    let pillars = [
      {
        pillarId: "ethical-leadership",
        pillarNumber: 1,
        name: "Ethical Leadership",
        description:
          "Establishing executive accountability, oversight structures, decision governance, and organizational ethics for AI.",
        weight: 1,
        order: 1,
      },
      {
        pillarId: "purpose-driven-innovation",
        pillarNumber: 2,
        name: "Purpose-Driven Innovation",
        description:
          "Defining clear purpose, stakeholder benefits, proportionality, and non-AI alternative evaluations for AI systems.",
        weight: 1,
        order: 2,
      },
      {
        pillarId: "human-centric-use",
        pillarNumber: 3,
        name: "Human-Centric Use",
        description:
          "Ensuring human-in-the-loop oversight, fallback/override capabilities, fairness testing, and user notification.",
        weight: 1,
        order: 3,
      },
      {
        pillarId: "responsible-implementation",
        pillarNumber: 4,
        name: "Responsible Implementation",
        description:
          "Model risk classification, pre-deployment validation, drift monitoring, cybersecurity resilience, and incident response.",
        weight: 1,
        order: 4,
      },
      {
        pillarId: "ai-literacy-workforce-readiness",
        pillarNumber: 5,
        name: "AI Literacy & Workforce Readiness",
        description:
          "Role-based AI governance training, technical competency development, and safe usage workforce policies.",
        weight: 1,
        order: 5,
      },
      {
        pillarId: "data-governance-integrity",
        pillarNumber: 6,
        name: "Data Governance & Integrity",
        description:
          "Data provenance, bias mitigation, data minimization, consent management, and training data quality standards.",
        weight: 1,
        order: 6,
      },
      {
        pillarId: "transparency-auditability",
        pillarNumber: 7,
        name: "Transparency & Auditability",
        description:
          "Comprehensive AI model card documentation, audit trail logging, explainability mechanisms, and regulatory compliance alignment.",
        weight: 1,
        order: 7,
      },
    ];
    let questions: any[] = [];
    let documentRequests: any[] = [];
    let meetingRequests: any[] = [];
    let maturityThresholds =
      assessmentType === "Full"
        ? {
            initialMax: 39,
            emergingMax: 69,
            establishedMax: 89,
            advancedMax: 100,
          }
        : {
            initialMax: 30,
            emergingMax: 60,
            establishedMax: 90,
            advancedMax: 120,
          };

    if (cloneFromVersion) {
      const source = await AssessmentFramework.findOne({
        version: cloneFromVersion,
        assessmentType,
      });
      if (!source) {
        return sendError(
          res,
          `Source framework version '${cloneFromVersion}' with type '${assessmentType}' not found to clone from`,
          404,
          "SOURCE_FRAMEWORK_NOT_FOUND"
        );
      }
      pillars = source.pillars.map((p) => ({
        pillarId: p.pillarId,
        pillarNumber: p.pillarNumber || 1,
        name: p.name,
        description: p.description,
        weight: p.weight,
        order: p.order,
      }));
      questions = source.questions.map((q) => ({
        questionId: q.questionId,
        pillarId: q.pillarId,
        pillarNumber: q.pillarNumber,
        pillarName: q.pillarName,
        section: q.section,
        text: q.text,
        controlDescription: q.controlDescription,
        testProcedure: q.testProcedure,
        remediationGuidance: q.remediationGuidance,
        organizationScope: q.organizationScope,
        linkedDocumentRequests: q.linkedDocumentRequests,
        assuranceTier: q.assuranceTier,
        regulatoryAlignments: q.regulatoryAlignments,
        helpText: q.helpText,
        mandatory: q.mandatory,
        isActive: q.isActive !== false,
        order: q.order,
        responseOptions: q.responseOptions,
      }));
      if (source.documentRequests) {
        documentRequests = source.documentRequests.map((d) => ({
          documentId: d.documentId,
          pillarNumber: d.pillarNumber,
          pillarName: d.pillarName,
          title: d.title,
          description: d.description,
          exampleContent: d.exampleContent,
          linkedControls: d.linkedControls,
        }));
      }
      if (source.meetingRequests) {
        meetingRequests = source.meetingRequests.map((m) => ({
          meetingNumber: m.meetingNumber,
          pillarName: m.pillarName,
          topic: m.topic,
          frameworkAlignment: m.frameworkAlignment,
          agendaItems: m.agendaItems,
          leaderTitles: m.leaderTitles,
          teamMemberTitles: m.teamMemberTitles,
          duration: m.duration,
          preparationNotes: m.preparationNotes,
        }));
      }
      if (source.maturityThresholds) {
        maturityThresholds = {
          initialMax: source.maturityThresholds.initialMax,
          emergingMax: source.maturityThresholds.emergingMax,
          establishedMax: source.maturityThresholds.establishedMax,
          advancedMax: source.maturityThresholds.advancedMax,
        };
      }
    }

    const newFramework = await AssessmentFramework.create({
      version,
      status: "Draft",
      assessmentType,
      title: title || `GRAICE ${assessmentType} Framework v${version}`,
      description:
        description ||
        `Configurable ${assessmentType} Assessment Framework version ${version}`,
      totalQuestions: questions.length,
      pillars,
      questions,
      documentRequests,
      meetingRequests,
      maturityThresholds,
    });

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_CREATED",
      entity: "AssessmentFramework",
      entityId: newFramework._id.toString(),
      after: {
        version: newFramework.version,
        assessmentType: newFramework.assessmentType,
        status: newFramework.status,
        totalQuestions: newFramework.totalQuestions,
        clonedFrom: cloneFromVersion || null,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, newFramework, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * List all framework versions with session usage metrics
 */
export async function listAllFrameworks(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const frameworks = await AssessmentFramework.find()
      .select("-questions")
      .sort({ createdAt: -1 });

    const frameworksWithMetrics = await Promise.all(
      frameworks.map(async (f) => {
        const sessionCount = await AssessmentSession.countDocuments({
          frameworkVersion: f.version,
          assessmentType: f.assessmentType,
        });

        return {
          _id: f._id,
          version: f.version,
          status: f.status,
          assessmentType: f.assessmentType,
          title: f.title,
          description: f.description,
          totalQuestions: f.totalQuestions,
          pillarsCount: f.pillars?.length || 7,
          maturityThresholds: f.maturityThresholds,
          inUseSessionCount: sessionCount,
          isImmutable: f.status !== "Draft" || sessionCount > 0,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        };
      })
    );

    return sendSuccess(res, frameworksWithMetrics);
  } catch (err) {
    next(err);
  }
}

/**
 * Get individual framework definition by ID
 */
export async function getFrameworkById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const framework = await AssessmentFramework.findById(id);

    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const sessionCount = await AssessmentSession.countDocuments({
      frameworkVersion: framework.version,
      assessmentType: framework.assessmentType,
    });

    return sendSuccess(res, {
      ...framework.toObject(),
      inUseSessionCount: sessionCount,
      isImmutable: framework.status !== "Draft" || sessionCount > 0,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Publish a Draft framework version.
 * Automatically archives previous published version of the same assessmentType.
 */
export async function publishFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    if (framework.status === "Published") {
      return sendError(
        res,
        "Framework version is already Published",
        400,
        "FRAMEWORK_ALREADY_PUBLISHED"
      );
    }

    if (framework.questions.length === 0) {
      return sendError(
        res,
        "Cannot publish a framework version with zero questions/controls",
        400,
        "FRAMEWORK_EMPTY_QUESTIONS"
      );
    }

    if (framework.pillars.length === 0) {
      return sendError(
        res,
        "Cannot publish a framework version with zero pillars",
        400,
        "FRAMEWORK_EMPTY_PILLARS"
      );
    }

    // Archive previous published framework of the same assessmentType
    await AssessmentFramework.updateMany(
      {
        _id: { $ne: framework._id },
        assessmentType: framework.assessmentType,
        status: "Published",
      },
      { status: "Archived" }
    );

    const previousStatus = framework.status;
    framework.status = "Published";
    framework.totalQuestions = framework.questions.length;
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_PUBLISHED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      before: { status: previousStatus },
      after: {
        status: framework.status,
        version: framework.version,
        assessmentType: framework.assessmentType,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Framework version '${framework.version}' (${framework.assessmentType}) is now Published and locked from further direct editing.`,
      framework,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Rollback / Re-activate an Archived framework version to Published.
 */
export async function rollbackFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    if (framework.status !== "Archived") {
      return sendError(
        res,
        `Only 'Archived' framework versions can be rolled back. Current status is '${framework.status}'`,
        400,
        "INVALID_ROLLBACK_STATUS"
      );
    }

    // Archive current published version
    await AssessmentFramework.updateMany(
      {
        _id: { $ne: framework._id },
        assessmentType: framework.assessmentType,
        status: "Published",
      },
      { status: "Archived" }
    );

    framework.status = "Published";
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_ROLLED_BACK",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      after: {
        version: framework.version,
        status: framework.status,
        assessmentType: framework.assessmentType,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Framework version '${framework.version}' (${framework.assessmentType}) has been restored as the active Published version.`,
      framework,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a Draft framework version.
 * Guardrail: Published or in-use versions cannot be deleted.
 */
export async function deleteDraftFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework cannot be deleted", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    await AssessmentFramework.findByIdAndDelete(id);

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_DELETED",
      entity: "AssessmentFramework",
      entityId: id,
      before: {
        version: framework.version,
        assessmentType: framework.assessmentType,
        status: framework.status,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Draft framework version '${framework.version}' was successfully removed.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a new question/control to a Draft framework version
 */
export async function addQuestionToFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const newQ = req.body as IQuestionControl;

    // Check duplicate questionId within this framework
    const exists = framework.questions.some((q) => q.questionId === newQ.questionId);
    if (exists) {
      return sendError(
        res,
        `Question control with ID '${newQ.questionId}' already exists in this framework version`,
        409,
        "QUESTION_ID_EXISTS"
      );
    }

    // Default response options if none provided (aligned with official GRAICE documents)
    if (!newQ.responseOptions || newQ.responseOptions.length === 0) {
      if (framework.assessmentType === "Full") {
        newQ.responseOptions = [
          { code: "NO_EXCEPTION_NOTED", label: "No Exception Noted", scoreValue: 1, order: 1 },
          { code: "EXCEPTION_NOTED", label: "Exception Noted", scoreValue: 0, order: 2 },
          { code: "NOT_ASSESSED", label: "Not Assessed", scoreValue: 0, order: 3 },
        ];
      } else {
        newQ.responseOptions = [
          { code: "YES", label: "Yes / Fully Implemented", scoreValue: 4, order: 1 },
          { code: "PARTIAL", label: "Partially Implemented", scoreValue: 3, order: 2 },
          { code: "PLANNED", label: "Planned / In Progress", scoreValue: 2, order: 3 },
          { code: "NO", label: "No / Not Implemented", scoreValue: 0, order: 4 },
          { code: "UNSURE", label: "Unsure", scoreValue: 0, order: 5 },
        ];
      }
    }

    framework.questions.push(newQ);
    framework.totalQuestions = framework.questions.length;
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_QUESTION_ADDED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      after: { questionId: newQ.questionId, pillarId: newQ.pillarId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Control '${newQ.questionId}' added to framework version '${framework.version}'.`,
      question: newQ,
      totalQuestions: framework.totalQuestions,
    }, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing question/control in a Draft framework version
 */
export async function updateQuestionInFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, questionId } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const qIndex = framework.questions.findIndex((q) => q.questionId === questionId);
    if (qIndex === -1) {
      return sendError(
        res,
        `Question with ID '${questionId}' not found in framework version '${framework.version}'`,
        404,
        "QUESTION_NOT_FOUND"
      );
    }

    const existingQ = framework.questions[qIndex];
    const beforeText = existingQ.text;

    // Merge updates onto existing subdocument
    Object.keys(req.body).forEach((key) => {
      if (key !== "questionId") {
        (existingQ as any)[key] = req.body[key];
      }
    });

    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_QUESTION_UPDATED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      before: { questionId, text: beforeText },
      after: { questionId, text: existingQ.text },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Control '${questionId}' updated successfully.`,
      question: framework.questions[qIndex],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle question active status in a Draft framework
 */
export async function toggleQuestionStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, questionId } = req.params;
    const { isActive } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const qIndex = framework.questions.findIndex((q) => q.questionId === questionId);
    if (qIndex === -1) {
      return sendError(res, `Question '${questionId}' not found`, 404, "QUESTION_NOT_FOUND");
    }

    framework.questions[qIndex].isActive = isActive;
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_QUESTION_STATUS_TOGGLED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      after: { questionId, isActive },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Control '${questionId}' active status set to ${isActive}.`,
      question: framework.questions[qIndex],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a question/control from a Draft framework version
 */
export async function deleteQuestionFromFramework(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, questionId } = req.params;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const qIndex = framework.questions.findIndex((q) => q.questionId === questionId);
    if (qIndex === -1) {
      return sendError(res, `Question '${questionId}' not found`, 404, "QUESTION_NOT_FOUND");
    }

    framework.questions.splice(qIndex, 1);
    framework.totalQuestions = framework.questions.length;
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_QUESTION_DELETED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      before: { questionId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: `Control '${questionId}' removed from framework version '${framework.version}'.`,
      totalQuestions: framework.totalQuestions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reorder questions within a Draft framework
 */
export async function reorderQuestions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { orders } = req.body as { orders: Array<{ questionId: string; order: number }> };
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const orderMap = new Map(orders.map((o) => [o.questionId, o.order]));

    framework.questions.forEach((q) => {
      if (orderMap.has(q.questionId)) {
        q.order = orderMap.get(q.questionId)!;
      }
    });

    framework.questions.sort((a, b) => a.order - b.order);
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_QUESTIONS_REORDERED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      after: { reorderedCount: orders.length },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Questions reordered successfully.",
      totalQuestions: framework.questions.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update pillar weights and descriptions in a Draft framework
 */
export async function updatePillars(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { pillars } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    framework.pillars = pillars;
    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_PILLARS_UPDATED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      after: { pillarsCount: pillars.length },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Framework pillars updated successfully.",
      pillars: framework.pillars,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Configure maturity classification thresholds in a Draft framework
 */
export async function updateMaturityThresholds(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { initialMax, emergingMax, establishedMax, advancedMax } = req.body;
    const actorId = req.user?.userId;
    const actorEmail = req.user?.email || "admin";

    const framework = await AssessmentFramework.findById(id);
    if (!framework) {
      return sendError(res, "Assessment framework not found", 404, "FRAMEWORK_NOT_FOUND");
    }

    const { editable, reason } = await checkFrameworkEditable(framework);
    if (!editable) {
      return sendError(res, reason || "Framework is locked", 409, "FRAMEWORK_VERSION_LOCKED");
    }

    const before = { ...framework.maturityThresholds };
    framework.maturityThresholds = {
      initialMax,
      emergingMax,
      establishedMax,
      advancedMax,
    };

    await framework.save();

    await AuditLog.create({
      actorId,
      actorEmail,
      action: "FRAMEWORK_THRESHOLDS_UPDATED",
      entity: "AssessmentFramework",
      entityId: framework._id.toString(),
      before,
      after: framework.maturityThresholds,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, {
      message: "Maturity classification thresholds updated successfully.",
      thresholds: framework.maturityThresholds,
    });
  } catch (err) {
    next(err);
  }
}
