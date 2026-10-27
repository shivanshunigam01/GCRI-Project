import { Router } from "express";
import {
  getMe,
  updateMe,
  getUsers,
  getUserById,
  inviteUser,
  acceptInvite,
  updateUserStatus,
  updateUserRole,
  adminResetPassword,
  adminUpdateUser,
} from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  UpdateProfileSchema,
  InviteUserSchema,
  AcceptInviteSchema,
  UpdateUserStatusSchema,
  UpdateUserRoleSchema,
  UserParamSchema,
} from "../schemas/user.schema.js";
import {
  AdminUserIdParamSchema,
  AdminUpdateUserSchema,
} from "../schemas/adminUser.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     summary: Get profile of authenticated user
 *     description: Returns current user account information, assigned role, company association, and MFA status.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authenticate, getMe);

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     summary: Update profile of authenticated user
 *     description: Updates personal contact details (name, phone number).
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", authenticate, validateRequest(UpdateProfileSchema), updateMe);

/**
 * @openapi
 * /api/v1/users/invite:
 *   post:
 *     summary: Invite a new user or assessor (Admin only)
 *     description: Generates a 48-hour cryptographic invitation token, pre-registers the user, and prepares invitation notification.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 example: new-assessor@graice.org
 *               name:
 *                 type: string
 *                 example: Sarah Jenkins
 *               role:
 *                 type: string
 *                 enum: [Admin, Assessor, MembershipApprover]
 *                 example: Assessor
 *               companyId:
 *                 type: string
 *                 example: 64b8f0a2e3129841cb027891
 *     responses:
 *       201:
 *         description: User invitation created
 *       403:
 *         description: Admin role required
 *       409:
 *         description: Email already registered
 */
router.post(
  "/invite",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(InviteUserSchema),
  inviteUser
);

/**
 * @openapi
 * /api/v1/users/accept-invite:
 *   post:
 *     summary: Accept user invitation and set password (Public)
 *     description: Validates cryptographic invitation token, establishes account password, and returns JWT session token for immediate login.
 *     tags:
 *       - User Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 example: StrongPassword123!
 *     responses:
 *       200:
 *         description: Invitation accepted, returns JWT token
 *       400:
 *         description: Invalid or expired token
 */
router.post("/accept-invite", validateRequest(AcceptInviteSchema), acceptInvite);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: List platform users (Admin only)
 *     description: Browse, paginate, search, and filter all registered users across the platform.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Admin, Assessor, MembershipApprover]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Deactivated]
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated user list
 *       403:
 *         description: Admin role required
 */
router.get("/", authenticate, authorize("SuperAdmin", "Admin"), getUsers);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user details by ID (Admin only)
 *     description: Detailed profile information for a specific user account.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(UserParamSchema),
  getUserById
);

/**
 * @openapi
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle user status (Active / Deactivated) (Admin only)
 *     description: Activates or deactivates a user account. Deactivated users cannot log in.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Deactivated]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Self-deactivation prohibited
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(UpdateUserStatusSchema),
  updateUserStatus
);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Reassign user role (Admin only)
 *     description: Assigns a new role (Admin, Assessor, MembershipApprover) to a user account.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [Admin, Assessor, MembershipApprover]
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Sole admin demotion prohibited
 *       403:
 *         description: Admin role required
 */
router.patch(
  "/:id/role",
  authenticate,
  authorize("SuperAdmin"),
  validateRequest(UpdateUserRoleSchema),
  updateUserRole
);

/**
 * @openapi
 * /api/v1/users/{id}/reset-password:
 *   post:
 *     summary: Admin initiate user password reset
 *     description: Generates a cryptographic password-reset link and token for the specified user account. Admin role only.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset initiated and token generated
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: User not found
 */
router.post(
  "/:id/reset-password",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(AdminUserIdParamSchema),
  adminResetPassword
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Admin update user account details
 *     description: Allows administrators to update user name, phone, company association, role, or active status. Admin role only.
 *     tags:
 *       - Admin User Management
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               companyId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Assessor, MembershipApprover]
 *               status:
 *                 type: string
 *                 enum: [Active, Deactivated]
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Sole admin modification prohibited
 *       403:
 *         description: Forbidden (Admin role required)
 */
router.patch(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "Admin"),
  validateRequest(AdminUpdateUserSchema),
  adminUpdateUser
);

export default router;
