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
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 */
router.get("/me", authenticate, getMe);

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     summary: Update profile of authenticated user
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch("/me", authenticate, validateRequest(UpdateProfileSchema), updateMe);

/**
 * @openapi
 * /api/v1/users/invite:
 *   post:
 *     summary: Invite a TenantAdmin (by SuperAdmin) or Auditor (by TenantAdmin)
 *     description: Top-down onboarding flow. SuperAdmin invites TenantAdmin into a Tenant; TenantAdmin invites Auditor into their Tenant.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: User invitation created
 */
router.post(
  "/invite",
  authenticate,
  authorize("SuperAdmin", "TenantAdmin"),
  validateRequest(InviteUserSchema),
  inviteUser
);

/**
 * @openapi
 * /api/v1/users/accept-invite:
 *   post:
 *     summary: Accept user invitation and set password (Public)
 *     description: Validates cryptographic invitation token, activates TenantMembership, and activates Pending Tenant when first TenantAdmin accepts.
 *     tags:
 *       - User Management
 *     responses:
 *       200:
 *         description: Invitation accepted, returns JWT token
 */
router.post("/accept-invite", validateRequest(AcceptInviteSchema), acceptInvite);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: List users (Scoped by role and tenant)
 *     description: SuperAdmin views platform users; TenantAdmin views tenant users; Auditor views active Auditors in the same tenant for sharing assessments.
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get("/", authenticate, authorize("SuperAdmin", "TenantAdmin", "Auditor"), getUsers);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "TenantAdmin"),
  validateRequest(UserParamSchema),
  getUserById
);

/**
 * @openapi
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Toggle user status (Active / Deactivated)
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("SuperAdmin", "TenantAdmin"),
  validateRequest(UpdateUserStatusSchema),
  updateUserStatus
);

/**
 * @openapi
 * /api/v1/users/{id}/role:
 *   patch:
 *     summary: Reassign user role (SuperAdmin only)
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Role updated
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
 *     tags:
 *       - Admin User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Password reset initiated and token generated
 */
router.post(
  "/:id/reset-password",
  authenticate,
  authorize("SuperAdmin", "TenantAdmin"),
  validateRequest(AdminUserIdParamSchema),
  adminResetPassword
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Admin update user account details
 *     tags:
 *       - Admin User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch(
  "/:id",
  authenticate,
  authorize("SuperAdmin", "TenantAdmin"),
  validateRequest(AdminUpdateUserSchema),
  adminUpdateUser
);

export default router;
