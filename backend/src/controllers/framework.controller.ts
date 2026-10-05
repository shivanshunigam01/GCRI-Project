import { Request, Response, NextFunction } from "express";
import { AssessmentFramework } from "../models/AssessmentFramework.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Get active/published framework by type (Light or Full)
 */
export async function getActiveFramework(req: Request, res: Response, next: NextFunction) {
  try {
    const assessmentType = (req.query.type as string) || "Full";
    const version = req.query.version as string;

    const query: Record<string, any> = {
      assessmentType,
      status: "Published",
    };
    if (version) {
      query.version = version;
    }

    const framework = await AssessmentFramework.findOne(query).sort({ createdAt: -1 });

    if (!framework) {
      return sendError(
        res,
        `No published framework found for type '${assessmentType}'`,
        404,
        "FRAMEWORK_NOT_FOUND"
      );
    }

    return sendSuccess(res, framework);
  } catch (err) {
    next(err);
  }
}

/**
 * List all framework versions
 */
export async function listFrameworks(req: Request, res: Response, next: NextFunction) {
  try {
    const frameworks = await AssessmentFramework.find()
      .select("-questions")
      .sort({ createdAt: -1 });

    return sendSuccess(res, frameworks);
  } catch (err) {
    next(err);
  }
}
