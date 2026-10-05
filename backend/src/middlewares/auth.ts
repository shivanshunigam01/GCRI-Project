import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/User.js";
import { sendError } from "../utils/response.js";

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Authorization token missing or malformed", 401, "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "default_jwt_secret_dev";

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    req.user = decoded;

    if (!req.user.companyId && req.user.userId) {
      const u = await User.findById(req.user.userId).select("companyId");
      if (u?.companyId) {
        req.user.companyId = u.companyId.toString();
      }
    }

    next();
  } catch {
    return sendError(res, "Invalid or expired token", 401, "INVALID_TOKEN");
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401, "UNAUTHORIZED");
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role ${req.user.role} does not have required permissions.`,
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
}
