import { Router } from "express";
import {
  assignAuditor,
  getAuditorMappings,
  getAuditorsForOrganization,
  getOrganizationsForAuditor,
  removeAuditorMapping,
} from "../controllers/auditorMapping.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  AssignAuditorSchema,
  AuditorParamSchema,
  OrganizationParamSchema,
  MappingIdParamSchema,
} from "../schemas/auditorMapping.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/admin/auditor-mappings:
 *   post:
 *     summary: Assign an Auditor to an Organization
 *     tags:
 *       - Auditor Assignments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - auditorId
 *             properties:
 *               organizationId:
 *                 type: string
 *               auditorId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Auditor successfully assigned
 *       400:
 *         description: Invalid auditor role or request
 *       404:
 *         description: Organization or Auditor not found
 *       409:
 *         description: Active assignment already exists
 */
router.post(
  "/",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(AssignAuditorSchema),
  assignAuditor
);

/**
 * @openapi
 * /api/v1/admin/auditor-mappings:
 *   get:
 *     summary: List all auditor-organization mappings platform-wide
 *     tags:
 *       - Auditor Assignments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive, All]
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: auditorId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of auditor-organization assignments
 */
router.get("/", authenticate, authorize("SuperAdmin", "Admin"), getAuditorMappings);

/**
 * @openapi
 * /api/v1/admin/auditor-mappings/org/{organizationId}:
 *   get:
 *     summary: List all auditors assigned to a specific organization
 *     tags:
 *       - Auditor Assignments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assigned auditors
 */
router.get(
  "/org/:organizationId",
  authenticate,
  authorize("SuperAdmin", "Admin", "Assessor"),
  validateRequest(OrganizationParamSchema),
  getAuditorsForOrganization
);

/**
 * @openapi
 * /api/v1/admin/auditor-mappings/auditor/{auditorId}:
 *   get:
 *     summary: List all organizations assigned to a specific auditor
 *     tags:
 *       - Auditor Assignments
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: auditorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assigned organizations
 */
router.get(
  "/auditor/:auditorId",
  authenticate,
  authorize("SuperAdmin", "Admin", "Assessor"),
  validateRequest(AuditorParamSchema),
  getOrganizationsForAuditor
);

/**
 * @openapi
 * /api/v1/admin/auditor-mappings/{id}:
 *   delete:
 *     summary: Remove/unassign an auditor from an organization
 *     tags:
 *       - Auditor Assignments
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
 *         description: Auditor successfully unassigned
 *       404:
 *         description: Mapping not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(MappingIdParamSchema),
  removeAuditorMapping
);

export default router;
