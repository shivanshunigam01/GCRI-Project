import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { sendSuccess } from "../utils/response.js";

const router = Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     summary: System and database health status
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server and database connectivity status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get("/health", (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return sendSuccess(res, {
    status: "healthy",
    service: "GRAICE Assessment Platform Backend API",
    version: "1.0.0",
    database: dbStatusMap[dbState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

export default router;
