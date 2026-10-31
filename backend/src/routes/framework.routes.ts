import { Router } from "express";
import { getActiveFramework, listFrameworks } from "../controllers/framework.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

/**
 * @openapi
 * /api/v1/frameworks/active:
 *   get:
 *     summary: Retrieve published framework definition
 *     description: Returns the published framework structure, 7 pillars, and complete control/question set for Full or Light assessment.
 *     tags:
 *       - Assessment Frameworks
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Light, Full]
 *           default: Full
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Framework definition
 */
router.get("/active", authenticate, getActiveFramework);

/**
 * @openapi
 * /api/v1/frameworks:
 *   get:
 *     summary: List all framework versions
 *     tags:
 *       - Assessment Frameworks
 *     security:
 *       - BearerAuth: []
 */
router.get("/", authenticate, listFrameworks);

export default router;
