import { Router } from "express";
import multer from "multer";
import {
  createAssessment,
  getAssessmentById,
  getAssessments,
  shareAssessment,
  revokeAssessmentShare,
  coSignAssessment,
  saveAnswers,
  getAssessmentProgress,
  submitAssessment,
  getCompanyAssessments,
  getEvidencePresignedUrl,
  uploadEvidenceDirect,
  getAssessmentGaps,
  getAssessmentSummary,
  getAssessmentPillars,
  getAssessmentRecommendations,
  getAssessmentFindings,
  generateAssessmentReport,
  downloadAssessmentReport,
  exportAssessmentExcel,
  sendAssessmentReminderNotification,
  sendAssessmentCompletionNotification,
} from "../controllers/assessment.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  CreateAssessmentSchema,
  SubmitAnswersSchema,
  AssessmentParamSchema,
  PresignedUrlSchema,
  ShareAssessmentSchema,
  RevokeShareAssessmentSchema,
  CoSignAssessmentSchema,
} from "../schemas/assessment.schema.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

const router = Router();

/**
 * @openapi
 * /api/v1/assessments:
 *   post:
 *     summary: Initialize a new assessment session (TenantAdmin or Auditor)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Assessment session initialized
 */
router.post(
  "/",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(CreateAssessmentSchema),
  createAssessment
);

/**
 * @openapi
 * /api/v1/assessments:
 *   get:
 *     summary: List assessment sessions (TenantAdmin sees own tenant; Auditor sees created or shared)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated sessions list
 */
router.get("/", authenticate, authorize("TenantAdmin", "Auditor"), getAssessments);

/**
 * @openapi
 * /api/v1/assessments/{id}:
 *   get:
 *     summary: Retrieve session state & answers (TenantAdmin or authorized Auditor)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Session details & saved answers
 */
router.get(
  "/:id",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentById
);

/**
 * @openapi
 * /api/v1/assessments/{id}/share:
 *   post:
 *     summary: Share assessment with other Auditors in the same tenant (TenantAdmin or Auditor)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Assessment shared with target auditor(s)
 */
router.post(
  "/:id/share",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(ShareAssessmentSchema),
  shareAssessment
);

/**
 * @openapi
 * /api/v1/assessments/{id}/share/{auditorId}:
 *   delete:
 *     summary: Revoke assessment share from an Auditor (TenantAdmin or Auditor)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Share access revoked
 */
router.delete(
  "/:id/share/:auditorId",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(RevokeShareAssessmentSchema),
  revokeAssessmentShare
);

/**
 * @openapi
 * /api/v1/assessments/{id}/co-sign:
 *   post:
 *     summary: Co-sign a shared or conducted assessment (Auditor only)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Assessment co-signed
 */
router.post(
  "/:id/co-sign",
  authenticate,
  authorize("Auditor"),
  validateRequest(CoSignAssessmentSchema),
  coSignAssessment
);

/**
 * @openapi
 * /api/v1/assessments/{id}/answers:
 *   put:
 *     summary: Submit single or batch answers (Auditor only)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Answers saved
 */
router.put(
  "/:id/answers",
  authenticate,
  authorize("Auditor"),
  validateRequest(SubmitAnswersSchema),
  saveAnswers
);

/**
 * @openapi
 * /api/v1/assessments/{id}/progress:
 *   get:
 *     summary: Real-time progress calculation
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time progress metrics
 */
router.get(
  "/:id/progress",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentProgress
);

/**
 * @openapi
 * /api/v1/assessments/{id}/submit:
 *   post:
 *     summary: Finalize and submit assessment (Auditor only)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Assessment finalized and scored
 */
router.post(
  "/:id/submit",
  authenticate,
  authorize("Auditor"),
  validateRequest(AssessmentParamSchema),
  submitAssessment
);

/**
 * @openapi
 * /api/v1/assessments/{id}/evidence/presigned-url:
 *   post:
 *     summary: Generate S3 presigned upload URL for audit evidence (Auditor only)
 *     tags:
 *       - Evidence Storage
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Presigned upload URL generated
 */
router.post(
  "/:id/evidence/presigned-url",
  authenticate,
  authorize("Auditor"),
  validateRequest(PresignedUrlSchema),
  getEvidencePresignedUrl
);

/**
 * @openapi
 * /api/v1/assessments/{id}/evidence/upload:
 *   post:
 *     summary: Direct evidence file upload to S3 (Auditor only)
 *     tags:
 *       - Evidence Storage
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: File uploaded and linked
 */
router.post(
  "/:id/evidence/upload",
  authenticate,
  authorize("Auditor"),
  upload.single("file"),
  uploadEvidenceDirect
);

/**
 * @openapi
 * /api/v1/assessments/{id}/gaps:
 *   get:
 *     summary: Get governance gaps & findings (TenantAdmin or authorized Auditor)
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Governance gaps extracted
 */
router.get(
  "/:id/gaps",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentGaps
);

/**
 * @openapi
 * /api/v1/assessments/company/{companyId}:
 *   get:
 *     summary: List assessment sessions for a Client Organization
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/company/:companyId",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  getCompanyAssessments
);

/**
 * @openapi
 * /api/v1/assessments/{id}/summary:
 *   get:
 *     summary: Retrieve executive maturity summary for an assessment (TenantAdmin or authorized Auditor)
 *     tags:
 *       - Assessment Analytics
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/summary",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentSummary
);

/**
 * @openapi
 * /api/v1/assessments/{id}/pillars:
 *   get:
 *     summary: Retrieve 7-pillar breakdown formatted for radar/spider charts
 *     tags:
 *       - Assessment Analytics
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/pillars",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentPillars
);

/**
 * @openapi
 * /api/v1/assessments/{id}/recommendations:
 *   get:
 *     summary: Retrieve tailored recommendations mapped to identified exceptions & gaps
 *     tags:
 *       - Assessment Analytics
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/recommendations",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentRecommendations
);

/**
 * @openapi
 * /api/v1/assessments/{id}/findings:
 *   get:
 *     summary: Retrieve structured findings matching Screen 5 (Findings & Exceptions)
 *     tags:
 *       - Assessment Analytics
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/findings",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  getAssessmentFindings
);

/**
 * @openapi
 * /api/v1/assessments/{id}/report:
 *   post:
 *     summary: Generate PDF audit report using PDFKit
 *     tags:
 *       - Reports & Exports
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/:id/report",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  generateAssessmentReport
);

/**
 * @openapi
 * /api/v1/assessments/{id}/report:
 *   get:
 *     summary: Download generated PDF audit report
 *     tags:
 *       - Reports & Exports
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/report",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  downloadAssessmentReport
);

/**
 * @openapi
 * /api/v1/assessments/{id}/export:
 *   get:
 *     summary: Export assessment findings to Excel (.xlsx) workbook
 *     tags:
 *       - Reports & Exports
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/:id/export",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  exportAssessmentExcel
);

/**
 * @openapi
 * /api/v1/assessments/{id}/remind:
 *   post:
 *     summary: Trigger manual assessment reminder notification
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/:id/remind",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  sendAssessmentReminderNotification
);

/**
 * @openapi
 * /api/v1/assessments/{id}/notifications/completion:
 *   post:
 *     summary: Trigger assessment completion scorecard alert
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 */
router.post(
  "/:id/notifications/completion",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(AssessmentParamSchema),
  sendAssessmentCompletionNotification
);

export default router;
