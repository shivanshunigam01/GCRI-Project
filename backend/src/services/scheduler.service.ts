import cron, { ScheduledTask } from "node-cron";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { emailService } from "./email.service.js";

export class PlatformSchedulerService {
  private tasks: ScheduledTask[] = [];

  /**
   * Initializes all recurring platform background cron tasks
   */
  public startScheduler(): void {
    console.log("[Scheduler] Initializing automated background schedulers...");

    // Task 1: Daily at 08:00 UTC — Approaching Due Date Reminders (<= 3 days)
    const dueReminderTask = cron.schedule("0 8 * * *", async () => {
      console.log("[Scheduler/Cron] Running approaching due date scan...");
      try {
        await this.scanApproachingDueDates();
      } catch (err) {
        console.error("[Scheduler/Cron] Error in due date scan:", err);
      }
    });
    this.tasks.push(dueReminderTask);

    // Task 2: Mondays at 09:00 UTC — Dormant Assessment Inactivity Scan (> 14 days)
    const inactivityTask = cron.schedule("0 9 * * 1", async () => {
      console.log("[Scheduler/Cron] Running dormant assessment scan...");
      try {
        await this.scanInactiveAssessments();
      } catch (err) {
        console.error("[Scheduler/Cron] Error in dormant assessment scan:", err);
      }
    });
    this.tasks.push(inactivityTask);

    console.log(`[Scheduler] ${this.tasks.length} background cron tasks started.`);
  }

  /**
   * Stops all active cron tasks
   */
  public stopScheduler(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks = [];
    console.log("[Scheduler] All scheduled tasks stopped.");
  }

  /**
   * Scans for in-progress assessments nearing their due date
   */
  public async scanApproachingDueDates(): Promise<number> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const approachingSessions = await AssessmentSession.find({
      status: "InProgress",
      dueDate: { $gte: now, $lte: threeDaysFromNow },
    });

    console.log(`[Scheduler] Found ${approachingSessions.length} session(s) nearing due date.`);

    const clientBaseUrl = process.env.CLIENT_BASE_URL || "http://localhost:3000";

    for (const session of approachingSessions) {
      try {
        const company = await Company.findById(session.companyId);
        const auditor = await User.findById(session.conductedByUserId);
        const recipientEmail = session.clientContact?.email || auditor?.email;

        if (recipientEmail && company) {
          const deepLinkUrl = `${clientBaseUrl}/assessments/${session._id}`;
          await emailService.sendAssessmentReminder({
            recipientEmail,
            assessmentId: session._id.toString(),
            companyName: company.name,
            frameworkTitle: `GRAICE Framework (${session.frameworkVersion} ${session.assessmentType})`,
            dueDate: session.dueDate,
            deepLinkUrl,
          });
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to process due reminder for session ${session._id}:`, err);
      }
    }

    return approachingSessions.length;
  }

  /**
   * Scans for dormant assessments with no answer activity for more than 14 days
   */
  public async scanInactiveAssessments(): Promise<number> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const dormantSessions = await AssessmentSession.find({
      status: "InProgress",
      updatedAt: { $lte: fourteenDaysAgo },
    });

    console.log(`[Scheduler] Found ${dormantSessions.length} dormant session(s).`);

    const clientBaseUrl = process.env.CLIENT_BASE_URL || "http://localhost:3000";

    for (const session of dormantSessions) {
      try {
        const company = await Company.findById(session.companyId);
        const auditor = await User.findById(session.conductedByUserId);

        if (auditor && company) {
          const deepLinkUrl = `${clientBaseUrl}/assessments/${session._id}`;
          await emailService.sendAssessmentReminder({
            recipientEmail: auditor.email,
            assessmentId: session._id.toString(),
            companyName: company.name,
            frameworkTitle: `GRAICE Framework (${session.frameworkVersion} ${session.assessmentType})`,
            deepLinkUrl,
          });
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to send inactivity notification for session ${session._id}:`, err);
      }
    }

    return dormantSessions.length;
  }
}

export const platformScheduler = new PlatformSchedulerService();
