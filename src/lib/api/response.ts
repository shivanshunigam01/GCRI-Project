import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export function apiSuccess<T>(data: T, status = 200, pagination?: ApiResponse<T>["pagination"]) {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(pagination && { pagination }),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export function apiError(
  message: string,
  statusCode = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: statusCode });
}
