import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { apiSuccess, apiError } from "@/lib/api/response";

export async function GET() {
  try {
    let dbStatus = "disconnected";
    try {
      if (process.env.MONGODB_URI) {
        await connectToDatabase();
        dbStatus = "connected";
      } else {
        dbStatus = "pending_configuration";
      }
    } catch {
      dbStatus = "error";
    }

    return apiSuccess({
      status: "healthy",
      service: "GRAICE Assessment Platform API",
      version: "v1.1",
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return apiError(message, 500, "HEALTH_CHECK_FAILED");
  }
}
