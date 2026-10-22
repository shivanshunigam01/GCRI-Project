import { Company } from "../models/Company.js";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { AuditLog } from "../models/AuditLog.js";

export interface IGCRAIAdapter {
  syncOrganizationAccreditation(companyId: string): Promise<{ success: boolean; registryReferenceId?: string }>;
  publishMaturityAssessment(sessionId: string): Promise<{ success: boolean; certificateId?: string }>;
}

export class GCRAIAdapterService implements IGCRAIAdapter {
  private apiBaseUrl: string;
  private apiKey: string;
  private isConfigured: boolean;

  constructor() {
    this.apiBaseUrl = process.env.GCRAI_API_BASE_URL || "https://api.gcrai.org/v1";
    this.apiKey = process.env.GCRAI_API_KEY || "";
    this.isConfigured = Boolean(this.apiKey);
  }

  /**
   * Synchronizes verified company organization data with the central GCRAI accreditation directory
   */
  public async syncOrganizationAccreditation(
    companyId: string
  ): Promise<{ success: boolean; registryReferenceId?: string }> {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    const payload = {
      name: company.name,
      domain: company.domain,
      verificationStatus: company.verificationStatus,
      verifiedAt: company.verificationAuditTrail?.verifiedAt || new Date(),
    };

    if (this.isConfigured) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/directory/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });

        const data = (await response.json()) as { registryId?: string };
        return { success: response.ok, registryReferenceId: data.registryId };
      } catch (err) {
        console.error("[GCRAIAdapter] Failed to sync organization accreditation:", err);
        return { success: false };
      }
    } else {
      // Standalone simulation mode for development/testing
      const simulatedRef = `GCRAI-ORG-${company._id.toString().slice(-6).toUpperCase()}`;
      console.log(`[GCRAIAdapter/DevMode] Simulated synchronization for "${company.name}". Ref: ${simulatedRef}`);

      await AuditLog.create({
        actorEmail: "system:gcrai-adapter",
        action: "GCRAI_OUTBOUND_SYNC",
        entity: "Company",
        entityId: company._id.toString(),
        after: { registryReferenceId: simulatedRef },
      });

      return { success: true, registryReferenceId: simulatedRef };
    }
  }

  /**
   * Publishes certified Responsible AI governance maturity rating to the central GCRAI observatory
   */
  public async publishMaturityAssessment(
    sessionId: string
  ): Promise<{ success: boolean; certificateId?: string }> {
    const session = await AssessmentSession.findById(sessionId);
    if (!session || session.status !== "Submitted") {
      throw new Error(`Valid submitted session required for certification sync: ${sessionId}`);
    }

    const company = await Company.findById(session.companyId);
    const score = session.scoreSnapshot?.compliancePercentage ?? session.scoreSnapshot?.overallPercentage ?? 0;
    const maturityLevel = session.scoreSnapshot?.maturityLevel || "Emerging";

    const payload = {
      assessmentId: session._id,
      organizationName: company?.name || "Unknown",
      domain: company?.domain || "",
      frameworkVersion: session.frameworkVersion,
      assessmentType: session.assessmentType,
      score,
      maturityLevel,
      submittedAt: session.submittedAt || new Date(),
    };

    if (this.isConfigured) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/observatory/assessments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        });

        const data = (await response.json()) as { certificateId?: string };
        return { success: response.ok, certificateId: data.certificateId };
      } catch (err) {
        console.error("[GCRAIAdapter] Failed to publish maturity assessment:", err);
        return { success: false };
      }
    } else {
      const simulatedCert = `CERT-GCRAI-${new Date().getFullYear()}-${session._id.toString().slice(-6).toUpperCase()}`;
      console.log(`[GCRAIAdapter/DevMode] Certified maturity published. Cert: ${simulatedCert}`);

      await AuditLog.create({
        actorEmail: "system:gcrai-adapter",
        action: "GCRAI_OUTBOUND_SYNC",
        entity: "AssessmentSession",
        entityId: session._id.toString(),
        after: { certificateId: simulatedCert, maturityLevel, score },
      });

      return { success: true, certificateId: simulatedCert };
    }
  }
}

export const gcraiAdapter = new GCRAIAdapterService();
