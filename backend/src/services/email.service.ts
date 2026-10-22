import nodemailer, { Transporter } from "nodemailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class TransactionalEmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;
  private isConfigured = false;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || "GRAICE Platform <no-reply@graice.ai>";
    this.initTransporter();
  }

  private initTransporter() {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.isConfigured = true;
      console.log(`[EmailService] SMTP transporter configured for host: ${process.env.SMTP_HOST}`);
    } else {
      console.warn(
        "[EmailService] SMTP credentials not fully configured. Operating in development mock/console mode."
      );
    }
  }

  /**
   * Base method to send an email with standard HTML envelope
   */
  public async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        console.log(`[EmailService] Email sent successfully to ${recipients}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.error(`[EmailService] Failed to send email to ${recipients}:`, err);
        return { success: false };
      }
    } else {
      // In development or test, log email payload safely
      console.log(`[EmailService/DevMock] To: ${recipients}`);
      console.log(`[EmailService/DevMock] Subject: ${options.subject}`);
      console.log(`[EmailService/DevMock] Preview: ${options.text || options.subject}`);
      return { success: true, messageId: `mock-${Date.now()}` };
    }
  }

  /**
   * Generates a modern branded HTML email layout for GRAICE
   */
  private renderBaseTemplate(title: string, bodyContent: string, actionButton?: { text: string; url: string }): string {
    const buttonHtml = actionButton
      ? `
        <div style="margin: 32px 0 24px 0; text-align: center;">
          <a href="${actionButton.url}" target="_blank" style="background-color: #4338CA; color: #FFFFFF; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; display: inline-block; font-size: 15px; letter-spacing: 0.2px;">
            ${actionButton.text}
          </a>
        </div>
        <p style="font-size: 12px; color: #64748B; text-align: center; word-break: break-all;">
          If the button does not work, copy and paste this URL into your browser:<br/>
          <a href="${actionButton.url}" style="color: #4338CA; text-decoration: underline;">${actionButton.url}</a>
        </p>
      `
      : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 40px 16px; color: #0F172A;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F172A; padding: 28px 32px; text-align: center;">
              <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 1.5px;">GRAICE</span>
              <span style="font-size: 13px; font-weight: 400; color: #94A3B8; margin-left: 8px; text-transform: uppercase; letter-spacing: 1px;">Assessment Platform</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">${title}</h2>
              <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                ${bodyContent}
              </div>
              ${buttonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <p style="margin: 0 0 4px 0;">This is an automated operational notification from the GRAICE Assessment Platform.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Global Cybersecurity & Risk AI Initiative (GCRAI). All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Template 1: User Invitation Email
   */
  public async sendUserInvitation(params: {
    recipientEmail: string;
    recipientName: string;
    organizationName?: string;
    role: string;
    invitationUrl: string;
    expiresInHours?: number;
  }) {
    const orgText = params.organizationName ? ` at <strong>${params.organizationName}</strong>` : "";
    const hours = params.expiresInHours || 48;

    const content = `
      <p>Hello ${params.recipientName},</p>
      <p>You have been invited to join the <strong>GRAICE Assessment Platform</strong> as an <strong>${params.role}</strong>${orgText}.</p>
      <p>The GRAICE Platform provides authoritative responsible AI governance evaluations aligned with EU AI Act, NIST AI RMF, and ISO 42001.</p>
      <p>Please click the button below to set your password and activate your account. This invitation link will expire in <strong>${hours} hours</strong>.</p>
    `;

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `Invitation to join GRAICE Assessment Platform`,
      html: this.renderBaseTemplate(
        "Welcome to the GRAICE Platform",
        content,
        { text: "Accept Invitation & Set Password", url: params.invitationUrl }
      ),
      text: `Hello ${params.recipientName}, you have been invited to join GRAICE as an ${params.role}. Open this link to accept: ${params.invitationUrl}`,
    });
  }

  /**
   * Template 2: Password Reset Email
   */
  public async sendPasswordReset(params: {
    recipientEmail: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }) {
    const minutes = params.expiresInMinutes || 60;
    const content = `
      <p>We received a request to reset the password for your GRAICE Assessment Platform account.</p>
      <p>Click the button below to choose a new password. For security, this link is single-use and will expire in <strong>${minutes} minutes</strong>.</p>
      <p style="margin-top: 20px; padding: 12px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; font-size: 13px; color: #92400E; border-radius: 4px;">
        <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or contact your administrator immediately.
      </p>
    `;

    return this.sendEmail({
      to: params.recipientEmail,
      subject: "GRAICE Platform — Password Reset Request",
      html: this.renderBaseTemplate(
        "Reset Your Password",
        content,
        { text: "Reset Password", url: params.resetUrl }
      ),
      text: `A password reset was requested for your GRAICE account. Open this link: ${params.resetUrl}`,
    });
  }

  /**
   * Template 3: MFA Security Alert
   */
  public async sendMfaAlert(params: {
    recipientEmail: string;
    action: "ENABLED" | "RECOVERY_CODES_REGENERATED";
    ipAddress?: string;
  }) {
    const actionText =
      params.action === "ENABLED"
        ? "Multi-Factor Authentication (TOTP) has been successfully activated"
        : "Emergency backup recovery codes have been regenerated";

    const content = `
      <p>This is a security notification confirming that <strong>${actionText}</strong> for your account.</p>
      <p>If you performed this action, no further steps are needed.</p>
      <p style="font-size: 13px; color: #64748B;">Timestamp: ${new Date().toUTCString()}<br/>IP: ${params.ipAddress || "Unknown"}</p>
    `;

    return this.sendEmail({
      to: params.recipientEmail,
      subject: "Security Notification: MFA Status Update",
      html: this.renderBaseTemplate("Security Alert: Multi-Factor Authentication", content),
      text: `Security Notification: ${actionText} on your account.`,
    });
  }

  /**
   * Template 4: Admin Notification — New Company Onboarded
   */
  public async sendAdminNewCompanyAlert(params: {
    adminEmails: string[];
    companyName: string;
    domain: string;
    actorEmail: string;
    verificationStatus: string;
  }) {
    const content = `
      <p>A new organization has been registered on the GRAICE Platform:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Organization:</td><td style="padding: 8px 0; font-weight: 600;">${params.companyName}</td></tr>
        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Domain:</td><td style="padding: 8px 0; font-weight: 600;">${params.domain}</td></tr>
        <tr style="border-bottom: 1px solid #E2E8F0;"><td style="padding: 8px 0; color: #64748B;">Onboarded By:</td><td style="padding: 8px 0;">${params.actorEmail}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">DNS Status:</td><td style="padding: 8px 0; font-weight: 600; color: ${params.verificationStatus === "Verified" ? "#16A34A" : "#D97706"};">${params.verificationStatus}</td></tr>
      </table>
    `;

    return this.sendEmail({
      to: params.adminEmails,
      subject: `[Admin Alert] New Organization Onboarded: ${params.companyName}`,
      html: this.renderBaseTemplate("New Organization Onboarded", content),
      text: `New company ${params.companyName} (${params.domain}) onboarded by ${params.actorEmail}. Status: ${params.verificationStatus}`,
    });
  }

  /**
   * Template 5: Admin Notification — Domain Verification Failure
   */
  public async sendAdminDomainAlert(params: {
    adminEmails: string[];
    companyName: string;
    domain: string;
    reason: string;
  }) {
    const content = `
      <p>Automated DNS legitimacy verification has failed or is pending review for the following organization:</p>
      <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 14px; margin: 16px 0;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #991B1B;">${params.companyName} (${params.domain})</p>
        <p style="margin: 0; font-size: 13px; color: #7F1D1D;"><strong>Failure Reason:</strong> ${params.reason}</p>
      </div>
      <p>Please log in to the Administrative Dashboard to review the organization profile and apply a manual verification override if appropriate.</p>
    `;

    return this.sendEmail({
      to: params.adminEmails,
      subject: `[Admin Action Required] Domain Verification Pending: ${params.companyName}`,
      html: this.renderBaseTemplate("Domain Verification Review Required", content),
      text: `Domain verification failed for ${params.companyName} (${params.domain}). Reason: ${params.reason}`,
    });
  }

  /**
   * Template 6: Assessment Assigned / Resumption Reminder
   */
  public async sendAssessmentReminder(params: {
    recipientEmail: string;
    assessmentId: string;
    companyName: string;
    frameworkTitle: string;
    dueDate?: Date;
    deepLinkUrl: string;
  }) {
    const dueText = params.dueDate ? `<p><strong>Target Due Date:</strong> ${params.dueDate.toLocaleDateString()}</p>` : "";
    const content = `
      <p>This is a reminder regarding the in-progress Responsible AI Governance Assessment for <strong>${params.companyName}</strong>.</p>
      <p><strong>Framework:</strong> ${params.frameworkTitle}</p>
      ${dueText}
      <p>You can resume your assessment directly from where you left off by clicking the button below:</p>
    `;

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `Assessment Reminder: ${params.companyName} — GRAICE Platform`,
      html: this.renderBaseTemplate(
        "Responsible AI Assessment In Progress",
        content,
        { text: "Resume Assessment", url: params.deepLinkUrl }
      ),
      text: `Assessment reminder for ${params.companyName}. Resume here: ${params.deepLinkUrl}`,
    });
  }

  /**
   * Template 7: Assessment Completed & Executive Report Available
   */
  public async sendAssessmentCompleted(params: {
    recipientEmail: string;
    companyName: string;
    assessmentType: string;
    score: number;
    maturityLevel: string;
    reportDownloadUrl?: string;
  }) {
    const content = `
      <p>The Responsible AI Governance assessment for <strong>${params.companyName}</strong> has been finalized and submitted.</p>
      <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
        <span style="font-size: 13px; text-transform: uppercase; color: #64748B; letter-spacing: 0.5px;">Executive Maturity Level</span>
        <div style="font-size: 26px; font-weight: 800; color: #4338CA; margin: 4px 0 10px 0;">${params.maturityLevel}</div>
        <div style="font-size: 15px; color: #334155;">Overall Score / Compliance: <strong>${params.score}%</strong></div>
      </div>
      <p>Your official audit findings register, 7-pillar radar metrics, and tailored remediation recommendations are now available for review.</p>
    `;

    const button = params.reportDownloadUrl
      ? { text: "Download Executive PDF Report", url: params.reportDownloadUrl }
      : undefined;

    return this.sendEmail({
      to: params.recipientEmail,
      subject: `Assessment Completed: ${params.companyName} (${params.maturityLevel})`,
      html: this.renderBaseTemplate("Assessment Complete & Finalized", content, button),
      text: `Assessment completed for ${params.companyName}. Level: ${params.maturityLevel}, Score: ${params.score}%.`,
    });
  }
}

export const emailService = new TransactionalEmailService();
