import { Router } from "express";
import { getAuditLogs, getAuditLogStats } from "../controllers/auditLog.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import { AuditLogQuerySchema } from "../schemas/auditLog.schema.js";

const router = Router();

// Enforce authentication and SuperAdmin / Admin role across all audit log routes
router.use(authenticate, authorize("SuperAdmin", "Admin"));

/**
 * @openapi
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Query and search audit trail logs
 *     description: Returns filterable, paginated audit logs capturing all administrative and security actions across the platform. Admin role only.
 *     tags:
 *       - Audit Log Explorer
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: "FRAMEWORK_PUBLISHED"
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *           example: "AssessmentFramework"
 *       - in: query
 *         name: actorEmail
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs retrieved successfully
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get("/", validateRequest(AuditLogQuerySchema), getAuditLogs);

/**
 * @openapi
 * /api/v1/admin/audit-logs/stats:
 *   get:
 *     summary: Retrieve audit log summary statistics
 *     description: Returns total events count, events in last 24h, top actions breakdown, and total authorization denials. Admin role only.
 *     tags:
 *       - Audit Log Explorer
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Audit statistics retrieved successfully
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.get("/stats", getAuditLogStats);

export default router;
