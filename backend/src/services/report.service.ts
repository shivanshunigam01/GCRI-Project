import fs from "fs";
import path from "path";
import crypto from "crypto";
import { IAssessmentSession, IReportMetadata } from "../models/AssessmentSession.js";
import { ICompany } from "../models/Company.js";
import { IAssessmentFramework } from "../models/AssessmentFramework.js";
import { IUser } from "../models/User.js";
import { s3Service } from "./s3.service.js";
import { buildGraiceReportData } from "./report/reportData.service.js";
import { renderGraiceReportPdf } from "./report/reportPdf.renderer.js";

export class ReportService {
  /**
   * Generates a comprehensive, branded PDF audit report for an assessment session.
   * Data is aggregated dynamically from session + framework; scoring reuses ScoringService.
   */
  public static async generateAssessmentReport(
    session: IAssessmentSession,
    company: ICompany,
    framework: IAssessmentFramework,
    auditor: IUser,
    conductedBy?: IUser | null
  ): Promise<{ metadata: IReportMetadata; buffer: Buffer }> {
    return new Promise((resolve, reject) => {
      try {
        const reportData = buildGraiceReportData({
          session,
          company,
          framework,
          auditor,
          conductedBy,
        });

        const doc = renderGraiceReportPdf(reportData);
        const buffers: Buffer[] = [];

        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("error", (err) => reject(err));
        doc.on("end", async () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            const checksum = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
            const timestamp = Date.now();
            const cleanCompName = company.name.replace(/[^a-zA-Z0-9_-]/g, "_");
            const fileName = `GRAICE_Report_${cleanCompName}_${session._id}_${timestamp}.pdf`;

            const reportsDir = path.join(s3Service.getUploadsDir(), "reports");
            if (!fs.existsSync(reportsDir)) {
              fs.mkdirSync(reportsDir, { recursive: true });
            }

            const localFilePath = path.join(reportsDir, fileName);
            await fs.promises.writeFile(localFilePath, pdfBuffer);

            const baseUrl = process.env.API_BASE_URL || "http://localhost:5001";
            const fileUrl = `${baseUrl}/uploads/reports/${fileName}`;

            const metadata: IReportMetadata = {
              fileName,
              filePath: localFilePath,
              fileUrl,
              fileSizeBytes: pdfBuffer.length,
              generatedAt: new Date(),
              generatedByUserId: auditor._id,
              checksum,
              storageType: "local",
            };

            resolve({ metadata, buffer: pdfBuffer });
          } catch (err) {
            reject(err);
          }
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
