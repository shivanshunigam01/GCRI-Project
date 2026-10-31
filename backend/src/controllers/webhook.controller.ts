import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { WebhookSubscription } from "../models/WebhookSubscription.js";
import { WebhookDispatcherService } from "../services/webhook.service.js";
import { AuditLog } from "../models/AuditLog.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { isAuditorAssignedToOrg } from "../middlewares/companyScope.js";

/**
 * Register a new outbound webhook endpoint
 */
export async function registerWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, events = ["assessment.submitted"], companyId: bodyCompanyId } = req.body;

    if (!url) {
      return sendError(res, "Webhook URL is required", 400, "URL_REQUIRED");
    }

    const companyId = bodyCompanyId || req.user?.companyId;
    if (!companyId) {
      return sendError(res, "Company ID is required", 400, "COMPANY_ID_REQUIRED");
    }

    if (req.user?.role !== "Admin") {
      const isAssigned = await isAuditorAssignedToOrg(req.user!.userId, companyId);
      if (!isAssigned) {
        return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
      }
    }

    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const webhook = await WebhookSubscription.create({
      companyId,
      url,
      secret,
      events,
      isActive: true,
      createdBy: req.user!.userId,
    });

    await AuditLog.create({
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
      action: "WEBHOOK_REGISTERED",
      entity: "WebhookSubscription",
      entityId: webhook._id.toString(),
      after: { url, events, companyId },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(
      res,
      {
        message: "Webhook registered successfully.",
        webhook: {
          id: webhook._id,
          companyId: webhook.companyId,
          url: webhook.url,
          secret: webhook.secret, // returned once for HMAC configuration
          events: webhook.events,
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * List webhooks for company
 */
export async function listWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyId: queryCompanyId } = req.query;
    const companyId = (queryCompanyId as string) || req.user?.companyId;

    const filter: Record<string, unknown> = {};
    if (companyId) {
      filter.companyId = companyId;
    }

    const webhooks = await WebhookSubscription.find(filter)
      .select("-secret")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { webhooks });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a webhook subscription
 */
export async function deleteWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const webhook = await WebhookSubscription.findById(id);

    if (!webhook) {
      return sendError(res, "Webhook subscription not found", 404, "WEBHOOK_NOT_FOUND");
    }

    if (req.user?.role !== "Admin") {
      const isAssigned = await isAuditorAssignedToOrg(req.user!.userId, webhook.companyId.toString());
      if (!isAssigned) {
        return sendError(res, "Access denied. You are not assigned to this organization.", 403, "CROSS_COMPANY_ACCESS_DENIED");
      }
    }

    await WebhookSubscription.findByIdAndDelete(id);

    await AuditLog.create({
      actorId: req.user!.userId,
      actorEmail: req.user!.email,
      action: "WEBHOOK_DELETED",
      entity: "WebhookSubscription",
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return sendSuccess(res, { message: "Webhook subscription deleted successfully." });
  } catch (err) {
    next(err);
  }
}

/**
 * Send test ping to verify endpoint connectivity
 */
export async function testWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const webhook = await WebhookSubscription.findById(id);

    if (!webhook) {
      return sendError(res, "Webhook subscription not found", 404, "WEBHOOK_NOT_FOUND");
    }

    const testResult = await WebhookDispatcherService.sendTestPing(webhook);

    return sendSuccess(res, {
      message: "Webhook test ping dispatched.",
      result: testResult,
    });
  } catch (err) {
    next(err);
  }
}
