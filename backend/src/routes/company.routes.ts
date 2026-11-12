import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  verifyCompany,
  updateCompanyStatus,
  getCompanyTrends,
} from "../controllers/company.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { requireCompanyScope } from "../middlewares/companyScope.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  CreateCompanySchema,
  UpdateCompanySchema,
  VerifyCompanySchema,
  UpdateCompanyStatusSchema,
  CompanyParamSchema,
} from "../schemas/company.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/companies:
 *   post:
 *     summary: Onboard a new Client Organization (TenantAdmin only)
 *     description: Creates a Client Organization within the TenantAdmin's tenant with name, domain, plan tier (Gold, Silver, Bronze), industry, and country, and triggers DNS verification.
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Client Organization onboarded successfully
 *       403:
 *         description: TenantAdmin role required
 */
router.post(
  "/",
  authenticate,
  authorize("TenantAdmin"),
  validateRequest(CreateCompanySchema),
  createCompany
);

/**
 * @openapi
 * /api/v1/companies:
 *   get:
 *     summary: List Client Organizations in the active tenant
 *     description: Visible only to the owning tenant's TenantAdmins and Auditors.
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated Client Organization list
 */
router.get("/", authenticate, authorize("TenantAdmin", "Auditor"), getCompanies);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   get:
 *     summary: Get Client Organization profile by ID
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Client Organization profile
 */
router.get(
  "/:id",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(CompanyParamSchema),
  requireCompanyScope("id"),
  getCompanyById
);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   patch:
 *     summary: Update Client Organization profile or plan tier (TenantAdmin only)
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Client Organization profile updated
 */
router.patch(
  "/:id",
  authenticate,
  authorize("TenantAdmin"),
  validateRequest(UpdateCompanySchema),
  requireCompanyScope("id"),
  updateCompany
);

/**
 * @openapi
 * /api/v1/companies/{id}/verify:
 *   post:
 *     summary: Verify Client Organization DNS legitimacy and set plan tier (TenantAdmin only)
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Verification status updated
 */
router.post(
  "/:id/verify",
  authenticate,
  authorize("TenantAdmin"),
  validateRequest(VerifyCompanySchema),
  requireCompanyScope("id"),
  verifyCompany
);

/**
 * @openapi
 * /api/v1/companies/{id}/status:
 *   patch:
 *     summary: Update Client Organization operational status (Active / Suspended) (TenantAdmin only)
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("TenantAdmin"),
  validateRequest(UpdateCompanyStatusSchema),
  requireCompanyScope("id"),
  updateCompanyStatus
);

/**
 * @openapi
 * /api/v1/companies/{id}/trends:
 *   get:
 *     summary: Retrieve historical assessment trends and score progression for a Client Organization
 *     tags:
 *       - Assessment Analytics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Historical trend progression retrieved successfully
 */
router.get(
  "/:id/trends",
  authenticate,
  authorize("TenantAdmin", "Auditor"),
  validateRequest(CompanyParamSchema),
  requireCompanyScope("id"),
  getCompanyTrends
);

export default router;
