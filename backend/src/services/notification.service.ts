import { EventEmitter } from "node:events";
import { ICompany } from "../models/Company.js";
import { IUser } from "../models/User.js";

class NotificationEmitter extends EventEmitter {}

export const notificationEvents = new NotificationEmitter();

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
