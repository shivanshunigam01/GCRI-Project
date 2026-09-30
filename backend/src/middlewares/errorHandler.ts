import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { sendError } from "../utils/response.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  console.error("[Error Handler]", err);

  if (err instanceof ZodError) {
    return sendError(
      res,
      "Validation Error",
      422,
      "VALIDATION_ERROR",
      err.issues
    );
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  return sendError(res, message, 500, "INTERNAL_SERVER_ERROR");
}
