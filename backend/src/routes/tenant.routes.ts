import { Router } from "express";
import {
  createTenant,
  assignTenantAdmin,
  getTenants,
  getMyTenants,
  getTenantById,
  updateTenantStatus,
} from "../controllers/tenant.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  CreateTenantSchema,
  AssignTenantAdminSchema,
  UpdateTenantStatusSchema,
  TenantParamSchema,
} from "../schemas/tenant.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/tenants/my:
 *   get:
 *     summary: List tenants the authenticated user belongs to
 *     description: Returns active tenant memberships for TenantAdmin or multi-tenant Auditor accounts.
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Active tenant memberships
 */
router.get("/my", authenticate, getMyTenants);

/**
 * @openapi
 * /api/v1/tenants:
 *   post:
 *     summary: Onboard a new Tenant workspace (SuperAdmin only)
 *     description: Creates an isolated Tenant record (Pending status) and optionally invites the first TenantAdmin. Tenant becomes Active once the TenantAdmin accepts.
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Tenant onboarded
 *       403:
 *         description: SuperAdmin role required
 */
router.post(
  "/",
  authenticate,
  authorize("SuperAdmin"),
  validateRequest(CreateTenantSchema),
  createTenant
);

/**
 * @openapi
 * /api/v1/tenants:
 *   get:
 *     summary: List all tenants with platform metadata (SuperAdmin only)
 *     description: Returns tenant records and high-level metadata counts without exposing assessment content.
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated tenant list
 */
router.get("/", authenticate, authorize("SuperAdmin"), getTenants);

/**
 * @openapi
 * /api/v1/tenants/{id}:
 *   get:
 *     summary: Get tenant metadata by ID
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant metadata
 */
router.get(
  "/:id",
  authenticate,
  validateRequest(TenantParamSchema),
  getTenantById
);

/**
 * @openapi
 * /api/v1/tenants/{id}/assign-admin:
 *   post:
 *     summary: Invite / assign first TenantAdmin to a tenant (SuperAdmin only)
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: TenantAdmin invited
 */
router.post(
  "/:id/assign-admin",
  authenticate,
  authorize("SuperAdmin"),
  validateRequest(AssignTenantAdminSchema),
  assignTenantAdmin
);

/**
 * @openapi
 * /api/v1/tenants/{id}/status:
 *   patch:
 *     summary: Suspend, retire, or reactivate a tenant (SuperAdmin only)
 *     tags:
 *       - Tenant Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant status updated
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("SuperAdmin"),
  validateRequest(UpdateTenantStatusSchema),
  updateTenantStatus
);

export default router;

