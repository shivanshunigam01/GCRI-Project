import { Router } from "express";
import {
  createFrameworkVersion,
  listAllFrameworks,
  getFrameworkById,
  publishFramework,
  rollbackFramework,
  deleteDraftFramework,
  addQuestionToFramework,
  updateQuestionInFramework,
  toggleQuestionStatus,
  deleteQuestionFromFramework,
  reorderQuestions,
  updatePillars,
  updateMaturityThresholds,
} from "../controllers/adminFramework.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  CreateFrameworkSchema,
  FrameworkIdParamSchema,
  QuestionParamSchema,
  CreateQuestionSchema,
  UpdateQuestionSchema,
  ToggleQuestionStatusSchema,
  ReorderQuestionsSchema,
  UpdatePillarsSchema,
  UpdateThresholdsSchema,
} from "../schemas/adminFramework.schema.js";

const router = Router();

// Enforce authentication and Admin role across all routes in this router
router.use(authenticate, authorize("Admin"));

/**
 * @openapi
 * /api/v1/admin/frameworks:
 *   post:
 *     summary: Create a new framework version (Draft)
 *     description: Initializes a new Draft framework version. Optionally clones pillars and questions from an existing published or draft version. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *               - assessmentType
 *             properties:
 *               version:
 *                 type: string
 *                 example: "0.9.0-draft"
 *               assessmentType:
 *                 type: string
 *                 enum: [Light, Full]
 *                 example: "Light"
 *               title:
 *                 type: string
 *                 example: "GRAICE Light Assessment Framework v0.9.0"
 *               description:
 *                 type: string
 *               cloneFromVersion:
 *                 type: string
 *                 example: "0.8.0"
 *     responses:
 *       201:
 *         description: Draft framework created successfully
 *       403:
 *         description: Forbidden (Admin role required)
 *       409:
 *         description: Conflict (Version already exists)
 */
router.post("/", validateRequest(CreateFrameworkSchema), createFrameworkVersion);

/**
 * @openapi
 * /api/v1/admin/frameworks:
 *   get:
 *     summary: List all framework versions with session usage metrics
 *     description: Returns all framework versions (Draft, Published, Archived) with total questions, pillar counts, and in-use session counts. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of frameworks retrieved successfully
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get("/", listAllFrameworks);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}:
 *   get:
 *     summary: Get framework details by ID
 *     description: Returns complete framework structure including all pillars, questions/controls, and maturity thresholds. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Framework definition retrieved
 *       404:
 *         description: Framework not found
 */
router.get("/:id", validateRequest(FrameworkIdParamSchema), getFrameworkById);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/publish:
 *   put:
 *     summary: Publish a Draft framework version
 *     description: Promotes a Draft framework to Published status and automatically archives the previous Published version of the same assessmentType. Locks version from further direct modification. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Framework published successfully
 *       400:
 *         description: Bad Request (Already published or empty questions)
 */
router.put("/:id/publish", validateRequest(FrameworkIdParamSchema), publishFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/rollback:
 *   put:
 *     summary: Rollback / Re-activate an Archived framework version
 *     description: Re-activates a previously archived version as Published, archiving the current published version. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Framework rolled back successfully
 */
router.put("/:id/rollback", validateRequest(FrameworkIdParamSchema), rollbackFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}:
 *   delete:
 *     summary: Delete a Draft framework version
 *     description: Deletes a Draft framework. Published versions and versions in use by assessment sessions cannot be deleted (returns 409 Conflict). Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Draft framework deleted
 *       409:
 *         description: Conflict (Framework version is locked or in use)
 */
router.delete("/:id", validateRequest(FrameworkIdParamSchema), deleteDraftFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/questions:
 *   post:
 *     summary: Add a control/question to a Draft framework
 *     description: Adds a control question to a Draft framework. Guardrail returns 409 Conflict if framework is Published or in use. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Question added successfully
 *       409:
 *         description: Conflict (Framework locked or duplicate questionId)
 */
router.post("/:id/questions", validateRequest(CreateQuestionSchema), addQuestionToFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/questions/reorder:
 *   put:
 *     summary: Reorder questions within a Draft framework
 *     description: Updates ordering array for questions in a Draft framework. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Questions reordered successfully
 *       409:
 *         description: Conflict (Framework locked)
 */
router.put("/:id/questions/reorder", validateRequest(ReorderQuestionsSchema), reorderQuestions);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/questions/{questionId}:
 *   put:
 *     summary: Update an existing control/question in a Draft framework
 *     description: Updates text, guidance, response options, or alignments. Draft only. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       409:
 *         description: Conflict (Framework locked)
 */
router.put("/:id/questions/:questionId", validateRequest(UpdateQuestionSchema), updateQuestionInFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/questions/{questionId}/status:
 *   patch:
 *     summary: Toggle question active status in a Draft framework
 *     description: Soft-activates or deactivates a question in Draft. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       409:
 *         description: Conflict (Framework locked)
 */
router.patch("/:id/questions/:questionId/status", validateRequest(ToggleQuestionStatusSchema), toggleQuestionStatus);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/questions/{questionId}:
 *   delete:
 *     summary: Delete a question/control from a Draft framework
 *     description: Removes a question from a Draft framework. Draft only. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question removed
 *       409:
 *         description: Conflict (Framework locked)
 */
router.delete("/:id/questions/:questionId", validateRequest(QuestionParamSchema), deleteQuestionFromFramework);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/pillars:
 *   put:
 *     summary: Update pillars, weights, and descriptions in a Draft framework
 *     description: Updates 7-pillar configuration in Draft. Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Pillars updated successfully
 *       409:
 *         description: Conflict (Framework locked)
 */
router.put("/:id/pillars", validateRequest(UpdatePillarsSchema), updatePillars);

/**
 * @openapi
 * /api/v1/admin/frameworks/{id}/thresholds:
 *   put:
 *     summary: Configure maturity classification thresholds in a Draft framework
 *     description: Configures score thresholds (initialMax, emergingMax, establishedMax, advancedMax). Admin role only.
 *     tags:
 *       - Framework Administration & Versioning
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
 *         description: Thresholds updated successfully
 *       409:
 *         description: Conflict (Framework locked)
 */
router.put("/:id/thresholds", validateRequest(UpdateThresholdsSchema), updateMaturityThresholds);

export default router;
