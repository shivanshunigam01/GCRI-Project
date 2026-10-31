import { Router } from "express";
import {
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  testWebhook,
} from "../controllers/webhook.controller.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

/**
 * @openapi
 * /api/v1/webhooks:
 *   post:
 *     summary: Register an outbound webhook subscription
 *     description: Registers a destination URL for signed event dispatch (e.g. assessment.submitted, assessment.scored). Returns the HMAC signing secret once.
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Webhook registered, returns HMAC secret key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookSubscriptionResponse'
 *       400:
 *         description: Validation error or invalid URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, registerWebhook);

/**
 * @openapi
 * /api/v1/webhooks:
 *   get:
 *     summary: List registered webhook subscriptions
 *     description: Returns active outbound webhook endpoints for the authenticated organization.
 *     tags:
 *       - Webhooks
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookListResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", authenticate, listWebhooks);

/**
 * @openapi
 * /api/v1/webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook subscription
 *     description: Removes a webhook endpoint from event dispatch.
 *     tags:
 *       - Webhooks
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
 *         description: Webhook deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Webhook not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authenticate, deleteWebhook);

/**
 * @openapi
 * /api/v1/webhooks/{id}/test:
 *   post:
 *     summary: Send a test ping payload to verify webhook receiver
 *     description: Emits an instant HMAC-SHA256 signed ping event to verify target endpoint connectivity.
 *     tags:
 *       - Webhooks
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
 *         description: Test ping result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookTestResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Webhook not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/test", authenticate, testWebhook);

export default router;
