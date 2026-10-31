import { EventEmitter } from "node:events";
import { ICompany } from "../models/Company.js";
import { IUser, User } from "../models/User.js";
import { emailService } from "./email.service.js";

class NotificationEmitter extends EventEmitter {}

export const notificationEvents = new NotificationEmitter();

// Attach automated listeners to forward platform events to email service
notificationEvents.on("COMPANY_ONBOARDED", async ({ company, actor }: { company: ICompany; actor: { id: string; email: string } }) => {
  try {
    const adminUsers = await User.find({ role: { $in: ["SuperAdmin", "Admin"] }, status: "Active" }).select("email");
    const adminEmails = adminUsers.map((u) => u.email);
    if (adminEmails.length === 0) {
      adminEmails.push(process.env.ADMIN_EMAIL || "admin@graice.ai");
    }

    await emailService.sendAdminNewCompanyAlert({
      adminEmails,
      companyName: company.name,
      domain: company.domain,
      actorEmail: actor.email,
      verificationStatus: company.verificationStatus,
    });
  } catch (err) {
    console.error("[NotificationService] Failed to send company onboarded email:", err);
  }
});

notificationEvents.on("DOMAIN_VERIFICATION_PENDING", async ({ company, reason }: { company: ICompany; reason: string }) => {
  try {
    const adminUsers = await User.find({ role: { $in: ["SuperAdmin", "Admin"] }, status: "Active" }).select("email");
    const adminEmails = adminUsers.map((u) => u.email);
    if (adminEmails.length === 0) {
      adminEmails.push(process.env.ADMIN_EMAIL || "admin@graice.ai");
    }

    await emailService.sendAdminDomainAlert({
      adminEmails,
      companyName: company.name,
      domain: company.domain,
      reason,
    });
  } catch (err) {
    console.error("[NotificationService] Failed to send domain verification pending email:", err);
  }
});

notificationEvents.on("USER_INVITED", async ({ user, invitedBy, rawToken }: { user: IUser; invitedBy: { id: string; email: string }; rawToken: string }) => {
  try {
    const clientBaseUrl = process.env.CLIENT_BASE_URL || "http://localhost:3000";
    const invitationUrl = `${clientBaseUrl}/accept-invite?token=${rawToken}`;

    await emailService.sendUserInvitation({
      recipientEmail: user.email,
      recipientName: user.name,
      role: user.role,
      invitationUrl,
      expiresInHours: 48,
    });
  } catch (err) {
    console.error("[NotificationService] Failed to send user invitation email:", err);
  }
});

export class NotificationService {
  /**
   * Dispatched when an assessor or admin successfully onboards a new organization.
   */
  static async onCompanyOnboarded(
    company: ICompany,
    actor: { id: string; email: string }
  ): Promise<void> {
    console.log(
      `[Notification/Admin] New Company Onboarded: "${company.name}" (${company.domain}) by ${actor.email}. Status: ${company.verificationStatus}`
    );
    notificationEvents.emit("COMPANY_ONBOARDED", { company, actor });
  }

  /**
   * Dispatched when automated domain verification fails and requires manual administrative inspection.
   */
  static async onDomainVerificationPending(
    company: ICompany,
    reason: string
  ): Promise<void> {
    console.warn(
      `[Notification/Admin] Domain Verification Pending for "${company.name}" (${company.domain}). Reason: ${reason}`
    );
    notificationEvents.emit("DOMAIN_VERIFICATION_PENDING", { company, reason });
  }

  /**
   * Dispatched when an administrator invites a new user or assessor.
   */
  static async onUserInvited(
    user: IUser,
    invitedBy: { id: string; email: string },
    rawToken: string
  ): Promise<void> {
    console.log(
      `[Notification/Invite] User Invited: ${user.email} (${user.role}) by ${invitedBy.email}. Token: ${rawToken}`
    );
    notificationEvents.emit("USER_INVITED", { user, invitedBy, rawToken });
  }

  /**
   * Dispatched when a user account status is updated (Active/Deactivated).
   */
  static async onUserStatusChanged(
    user: IUser,
    previousStatus: string,
    actor: { id: string; email: string }
  ): Promise<void> {
    console.log(
      `[Notification/Audit] User status updated for ${user.email}: ${previousStatus} -> ${user.status} by ${actor.email}`
    );
    notificationEvents.emit("USER_STATUS_CHANGED", { user, previousStatus, actor });
  }
}
