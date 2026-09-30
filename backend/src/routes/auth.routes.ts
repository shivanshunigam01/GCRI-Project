import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validate.js";
import { RegisterSchema, LoginSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validateRequest(RegisterSchema), register);
router.post("/login", validateRequest(LoginSchema), login);

export default router;
