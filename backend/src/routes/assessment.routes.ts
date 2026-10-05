import { Router } from "express";
import multer from "multer";
import {
  createAssessment,
  getAssessmentById,
  getAssessments,
  saveAnswers,
  getAssessmentProgress,
  submitAssessment,
  getCompanyAssessments,
  getEvidencePresignedUrl,
  uploadEvidenceDirect,
  getAssessmentGaps,
} from "../controllers/assessment.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  CreateAssessmentSchema,
  SubmitAnswersSchema,
  AssessmentParamSchema,
  PresignedUrlSchema,
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
 *     summary: Initialize a new assessment session
 *     description: Creates an assessment session (Light or Full) for an organization, binding it to the published framework.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - assessmentType
 *             properties:
 *               companyId:
 *                 type: string
 *                 example: 64b8f0a2e3129841cb027891
 *               assessmentType:
 *                 type: string
 *                 enum: [Light, Full]
 *                 example: Full
 *               frameworkVersion:
 *                 type: string
 *                 example: "2026.1"
 *     responses:
 *       201:
 *         description: Assessment session initialized
 *       400:
 *         description: Validation error
 *       403:
 *         description: Cross-company access denied
 */
router.post(
  "/",
  authenticate,
  authorize("Admin", "Assessor"),
  validateRequest(CreateAssessmentSchema),
  createAssessment
);

/**
 * @openapi
 * /api/v1/assessments:
 *   get:
 *     summary: List assessment sessions
 *     description: Returns assessment sessions. Assessors only see their company's sessions; Admins see all.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [InProgress, Submitted, Archived]
 *       - in: query
 *         name: assessmentType
 *         schema:
 *           type: string
 *           enum: [Light, Full]
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated sessions list
 */
router.get("/", authenticate, getAssessments);

/**
 * @openapi
 * /api/v1/assessments/{id}:
 *   get:
 *     summary: Retrieve session state & answers (Save & Resume)
 *     description: Returns saved state, answer history, and associated framework questions.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details & saved answers
 *       404:
 *         description: Session not found
 */
router.get("/:id", authenticate, validateRequest(AssessmentParamSchema), getAssessmentById);

/**
 * @openapi
 * /api/v1/assessments/{id}/answers:
 *   put:
 *     summary: Submit single or batch answers
 *     description: Updates question answers for an InProgress assessment session.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - questionId
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       example: P1-C01
 *                     testStatus:
 *                       type: string
 *                       enum: [NotStarted, InProgress, Complete]
 *                     exceptionStatus:
 *                       type: string
 *                       enum: [NoExceptionNoted, ExceptionNoted, NotAssessed]
 *                     evidenceNotes:
 *                       type: string
 *                     workPaperReference:
 *                       type: string
 *     responses:
 *       200:
 *         description: Answers saved
 *       400:
 *         description: Assessment already submitted
 */
router.put(
  "/:id/answers",
  authenticate,
  authorize("Admin", "Assessor"),
  validateRequest(SubmitAnswersSchema),
  saveAnswers
);

/**
 * @openapi
 * /api/v1/assessments/{id}/progress:
 *   get:
 *     summary: Real-time progress calculation
 *     description: Calculates completion percentage overall and broken down across all 7 GRAICE Pillars.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Real-time progress metrics
 */
router.get(
  "/:id/progress",
  authenticate,
  validateRequest(AssessmentParamSchema),
  getAssessmentProgress
);

/**
 * @openapi
 * /api/v1/assessments/{id}/submit:
 *   post:
 *     summary: Finalize and submit assessment
 *     description: Locks session answers from editing, executes deterministic scoring engine, and persists immutable score snapshot.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assessment finalized and scored
 *       400:
 *         description: Already submitted
 */
router.post(
  "/:id/submit",
  authenticate,
  authorize("Admin", "Assessor"),
  validateRequest(AssessmentParamSchema),
  submitAssessment
);

/**
 * @openapi
 * /api/v1/assessments/{id}/evidence/presigned-url:
 *   post:
 *     summary: Generate S3 presigned upload URL for audit evidence
 *     description: Issues a secure, temporary presigned PUT URL allowing clients to upload evidence files directly to S3.
 *     tags:
 *       - Evidence Storage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionId
 *               - fileName
 *               - contentType
 *             properties:
 *               questionId:
 *                 type: string
 *                 example: P1-C01
 *               fileName:
 *                 type: string
 *                 example: Board_Charter_2026.pdf
 *               contentType:
 *                 type: string
 *                 example: application/pdf
 *     responses:
 *       200:
 *         description: Presigned upload URL generated
 */
router.post(
  "/:id/evidence/presigned-url",
  authenticate,
  authorize("Admin", "Assessor"),
  validateRequest(PresignedUrlSchema),
  getEvidencePresignedUrl
);

/**
 * @openapi
 * /api/v1/assessments/{id}/evidence/upload:
 *   post:
 *     summary: Direct evidence file upload to S3
 *     description: Multi-part form upload that streams file directly to S3 and attaches URL to question response.
 *     tags:
 *       - Evidence Storage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File uploaded and linked
 */
router.post(
  "/:id/evidence/upload",
  authenticate,
  authorize("Admin", "Assessor"),
  upload.single("file"),
  uploadEvidenceDirect
);

/**
 * @openapi
 * /api/v1/assessments/{id}/gaps:
 *   get:
 *     summary: Get governance gaps & findings
 *     description: Lists all controls with noted exceptions or zero scores, mapped to regulatory requirements.
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Governance gaps extracted
 */
router.get("/:id/gaps", authenticate, validateRequest(AssessmentParamSchema), getAssessmentGaps);

/**
 * @openapi
 * /api/v1/companies/{companyId}/assessments:
 *   get:
 *     summary: List all assessment sessions for a company
 *     tags:
 *       - Assessment Sessions
 *     security:
 *       - BearerAuth: []
 */
router.get(
  "/company/:companyId",
  authenticate,
  getCompanyAssessments
);

export default router;
