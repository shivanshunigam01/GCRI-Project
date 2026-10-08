import { Router } from "express";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import companyRoutes from "./company.routes.js";
import userRoutes from "./user.routes.js";
import assessmentRoutes from "./assessment.routes.js";
import frameworkRoutes from "./framework.routes.js";
import auditorMappingRoutes from "./auditorMapping.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/", healthRoutes);
router.use("/auth", authRoutes);
router.use("/companies", companyRoutes);
router.use("/users", userRoutes);
router.use("/assessments", assessmentRoutes);
router.use("/frameworks", frameworkRoutes);
router.use("/admin/auditor-mappings", auditorMappingRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
