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
 *     summary: Onboard a new organization
 *     description: Creates a company profile, triggers automated DNS domain legitimacy verification, and associates unassigned Assessors with the new company.
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - domain
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme AI Corporation
 *               domain:
 *                 type: string
 *                 example: acme-ai.com
 *               registrationNumber:
 *                 type: string
 *                 example: REG-2026-9921
 *               country:
 *                 type: string
 *                 example: United States
 *               industry:
 *                 type: string
 *                 example: FinTech / AI
 *     responses:
 *       201:
 *         description: Company onboarded successfully
 *       400:
 *         description: Invalid input or domain format
 *       409:
 *         description: Domain already onboarded
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  authenticate,
  authorize("Admin", "Assessor"),
  validateRequest(CreateCompanySchema),
  createCompany
);

/**
 * @openapi
 * /api/v1/companies:
 *   get:
 *     summary: List companies
 *     description: Lists companies with pagination and search. Assessors only see their assigned company; Admins see all.
 *     tags:
 *       - Company Management
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
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Suspended]
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [Verified, Pending, Rejected]
 *     responses:
 *       200:
 *         description: Paginated company list
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticate, getCompanies);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   get:
 *     summary: Get company profile by ID
 *     description: Retrieves company profile. Strictly protected by tenant isolation guards (IDOR prevention).
 *     tags:
 *       - Company Management
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
 *         description: Company profile
 *       403:
 *         description: Cross-company access denied
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id",
  authenticate,
  validateRequest(CompanyParamSchema),
  requireCompanyScope("id"),
  getCompanyById
);

/**
 * @openapi
 * /api/v1/companies/{id}:
 *   patch:
 *     summary: Update company profile
 *     description: Updates company metadata. Guarded by tenant isolation policies.
 *     tags:
 *       - Company Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               registrationNumber:
 *                 type: string
 *               country:
 *                 type: string
 *               industry:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company profile updated
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Company not found
 */
router.patch(
  "/:id",
  authenticate,
  validateRequest(UpdateCompanySchema),
  requireCompanyScope("id"),
  updateCompany
);

/**
 * @openapi
 * /api/v1/companies/{id}/verify:
 *   post:
 *     summary: Manually verify or reject company legitimacy (Admin only)
 *     description: Admin override to transition company legitimacy to Verified, Rejected, or Pending with audit notes.
 *     tags:
 *       - Company Management
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
 *               - verificationStatus
 *             properties:
 *               verificationStatus:
 *                 type: string
 *                 enum: [Verified, Pending, Rejected]
 *               notes:
 *                 type: string
 *                 example: Verified business registration via official state portal.
 *     responses:
 *       200:
 *         description: Verification status updated
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Company not found
 */
router.post(
  "/:id/verify",
  authenticate,
  authorize("Admin"),
  validateRequest(VerifyCompanySchema),
  verifyCompany
);

/**
 * @openapi
 * /api/v1/companies/{id}/status:
 *   patch:
 *     summary: Update company operational status (Active / Suspended) (Admin only)
 *     description: Suspends or reactivates a company across the assessment platform.
 *     tags:
 *       - Company Management
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Suspended]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("Admin"),
  validateRequest(UpdateCompanyStatusSchema),
  updateCompanyStatus
);

/**
 * @openapi
 * /api/v1/companies/{id}/trends:
 *   get:
 *     summary: Retrieve historical assessment trends and score progression for an organization
 *     description: Returns sequential assessment scores, maturity level progression, and delta improvement percentage across finalized assessments.
 *     tags:
 *       - Assessment Analytics
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
 *         description: Historical trend progression retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Company not found
 */
router.get(
  "/:id/trends",
  authenticate,
  validateRequest(CompanyParamSchema),
  getCompanyTrends
);

export default router;

