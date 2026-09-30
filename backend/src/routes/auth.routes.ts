import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validate.js";
import { RegisterSchema, LoginSchema } from "../schemas/auth.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new Assessor or User
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: Email already registered
 *       422:
 *         description: Validation error
 */
router.post("/register", validateRequest(RegisterSchema), register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: User login with credentials and optional MFA token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful, returns JWT bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account temporarily locked due to excessive failed attempts
 */
router.post("/login", validateRequest(LoginSchema), login);

export default router;
