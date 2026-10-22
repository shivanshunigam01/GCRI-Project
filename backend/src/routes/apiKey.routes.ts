import { Router } from "express";
import { createApiKey, listApiKeys, revokeApiKey } from "../controllers/apiKey.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";

const router = Router();

/**
 * @openapi
 * /api/v1/admin/api-keys:
 *   post:
 *     summary: Generate a new Machine-to-Machine (M2M) API Key
 *     description: Creates an API key for headless service authentication. The raw secret is returned exactly once in the response.
 *     tags:
 *       - Machine-to-Machine Authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiKeyCreateRequest'
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKeyCreateResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden (Admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, authorize("Admin"), createApiKey);

/**
 * @openapi
 * /api/v1/admin/api-keys:
 *   get:
 *     summary: List active M2M API Keys
 *     description: Returns directory of created API keys with metadata (secrets masked).
 *     tags:
 *       - Machine-to-Machine Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKeyListResponse'
 *       403:
 *         description: Forbidden (Admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, authorize("Admin"), listApiKeys);

/**
 * @openapi
 * /api/v1/admin/api-keys/{id}:
 *   delete:
 *     summary: Revoke an M2M API Key
 *     description: Deactivates an API key, permanently revoking its access permissions.
 *     tags:
 *       - Machine-to-Machine Authentication
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
 *         description: API key revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Forbidden (Admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: API key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authenticate, authorize("Admin"), revokeApiKey);

export default router;
