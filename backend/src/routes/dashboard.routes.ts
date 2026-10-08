import { Router } from "express";
import {
  getAdminDashboardSummary,
  getAdminDashboardAssessments,
  getAuditorDashboardSummary,
  getAuditorDashboardAssessments,
  getAuditorOrganizations,
} from "../controllers/dashboard.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  AdminDashboardAssessmentsQuerySchema,
  AuditorDashboardAssessmentsQuerySchema,
} from "../schemas/dashboard.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/dashboard/admin/summary:
 *   get:
 *     summary: Retrieve Admin operational platform statistics (Screen 7 Alignment)
 *     description: Returns 12 platform operational metric cards, assessment status distributions, subscription tier splits, and non-confidential recent audit activity. Strictly excludes confidential assessment answers and scores.
 *     tags:
 *       - Dashboard - Admin
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Operational dashboard summary retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Platform administrators only
 */
router.get("/admin/summary", authenticate, authorize("Admin"), getAdminDashboardSummary);

/**
 * @openapi
 * /api/v1/dashboard/admin/assessments:
 *   get:
 *     summary: Retrieve Admin filterable assessment metadata table (Screen 7 Alignment)
 *     description: Returns assessment operational metadata (Organization name, Auditor name, Assessment Type, Status, Created Date, Completed Date) with zero confidential answers or scores.
 *     tags:
 *       - Dashboard - Admin
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, InProgress, Submitted, Archived]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: assessmentType
 *         schema:
 *           type: string
 *           enum: [all, Light, Full]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Assessment metadata table retrieved successfully
 */
router.get(
  "/admin/assessments",
  authenticate,
  authorize("Admin"),
  validateRequest(AdminDashboardAssessmentsQuerySchema),
  getAdminDashboardAssessments
);

/**
 * @openapi
 * /api/v1/dashboard/auditor/summary:
 *   get:
 *     summary: Retrieve Auditor workload summary & 7-pillar progress (Screen 1 Alignment)
 *     description: Returns workload cards (active assessments, completed assessments, findings count, assigned organizations), overall completion %, 7-pillar horizontal progress breakdown array, assessment type distribution, latest findings, and resumption links.
 *     tags:
 *       - Dashboard - Auditor
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Auditor workload summary retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Assessors only
 */
router.get("/auditor/summary", authenticate, authorize("Assessor"), getAuditorDashboardSummary);

/**
 * @openapi
 * /api/v1/dashboard/auditor/assessments:
 *   get:
 *     summary: Retrieve filterable assessments for assigned organizations
 *     description: Returns list of assessments for companies mapped to the logged-in auditor, with completion percentages and deep-link resumption aid.
 *     tags:
 *       - Dashboard - Auditor
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, InProgress, Submitted, Archived]
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: assessmentType
 *         schema:
 *           type: string
 *           enum: [all, Light, Full]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assessments retrieved successfully
 */
router.get(
  "/auditor/assessments",
  authenticate,
  authorize("Assessor"),
  validateRequest(AuditorDashboardAssessmentsQuerySchema),
  getAuditorDashboardAssessments
);

/**
 * @openapi
 * /api/v1/dashboard/auditor/organizations:
 *   get:
 *     summary: Retrieve organizations mapped to auditor with assessment summary (Screen 2 Alignment)
 *     description: Returns companies assigned to the logged-in auditor via AuditorOrganization with active assessment statistics and detail drawer metadata.
 *     tags:
 *       - Dashboard - Auditor
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Accessible organizations retrieved successfully
 */
router.get("/auditor/organizations", authenticate, authorize("Assessor"), getAuditorOrganizations);

export default router;
