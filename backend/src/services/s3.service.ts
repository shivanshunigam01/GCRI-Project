import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

export interface PresignedUrlResult {
  uploadUrl: string;
  s3Key: string;
  fileUrl: string;
  storageType: "s3" | "local";
  expiresInSeconds: number;
}

export interface DirectUploadResult {
  fileUrl: string;
  s3Key: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageType: "s3" | "local";
}

class S3StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private region: string;
  private isS3Configured = false;
  private localUploadsDir: string;

  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || "";
    this.localUploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads");

    if (
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      this.bucketName
    ) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.isS3Configured = true;
      console.log(`[S3Service] AWS S3 initialized for bucket: ${this.bucketName} (${this.region})`);
    } else {
      console.warn(
        "[S3Service] AWS S3 credentials not fully configured. Operating in local filesystem storage mode."
      );
      try {
        if (!fs.existsSync(this.localUploadsDir)) {
          fs.mkdirSync(this.localUploadsDir, { recursive: true });
        }
      } catch (err) {
        // Fallback to OS temp directory if process.cwd() is not writable
        this.localUploadsDir = path.resolve(os.tmpdir(), "graice_uploads");
        if (!fs.existsSync(this.localUploadsDir)) {
          fs.mkdirSync(this.localUploadsDir, { recursive: true });
        }
      }
    }
  }

  public getUploadsDir(): string {
    return this.localUploadsDir;
  }

  /**
   * Generates a unique, structured S3 object key
   */
  public generateKey(companyId: string, assessmentId: string, questionId: string, originalName: string): string {
    const cleanName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueHash = crypto.randomBytes(6).toString("hex");
    const timestamp = Date.now();
    return `evidence/${companyId}/${assessmentId}/${questionId}/${timestamp}_${uniqueHash}_${cleanName}`;
  }

  /**
   * Generates a presigned PUT URL for client-side direct S3 upload
   */
  public async getPresignedUploadUrl(
    companyId: string,
    assessmentId: string,
    questionId: string,
    fileName: string,
    contentType: string,
    expiresIn = 900 // 15 minutes
  ): Promise<PresignedUrlResult> {
    const s3Key = this.generateKey(companyId, assessmentId, questionId, fileName);

    if (this.isS3Configured && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

      return {
        uploadUrl,
        s3Key,
        fileUrl,
        storageType: "s3",
        expiresInSeconds: expiresIn,
      };
    } else {
      // Local development fallback endpoint
      const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
      const localUrl = `${baseUrl}/api/v1/assessments/${assessmentId}/evidence/upload-direct?key=${encodeURIComponent(s3Key)}`;
      const fileUrl = `${baseUrl}/uploads/${s3Key.replace(/\//g, "_")}`;

      return {
        uploadUrl: localUrl,
        s3Key,
        fileUrl,
        storageType: "local",
        expiresInSeconds: expiresIn,
      };
    }
  }

  /**
   * Direct upload via buffer/stream (used by multi-part form upload)
   */
  public async uploadFileBuffer(
    buffer: Buffer,
    companyId: string,
    assessmentId: string,
    questionId: string,
    originalName: string,
    mimeType: string
  ): Promise<DirectUploadResult> {
    const s3Key = this.generateKey(companyId, assessmentId, questionId, originalName);

    if (this.isS3Configured && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;

      return {
        fileUrl,
        s3Key,
        fileName: originalName,
        fileSizeBytes: buffer.length,
        mimeType,
        storageType: "s3",
      };
    } else {
      // Save locally
      try {
        if (!fs.existsSync(this.localUploadsDir)) {
          fs.mkdirSync(this.localUploadsDir, { recursive: true });
        }
      } catch {
        this.localUploadsDir = path.resolve(os.tmpdir(), "graice_uploads");
        if (!fs.existsSync(this.localUploadsDir)) {
          fs.mkdirSync(this.localUploadsDir, { recursive: true });
        }
      }

      const localFileName = s3Key.replace(/\//g, "_");
      const localFilePath = path.join(this.localUploadsDir, localFileName);
      await fs.promises.writeFile(localFilePath, buffer);

      const baseUrl = process.env.API_BASE_URL || "http://localhost:5000";
      const fileUrl = `${baseUrl}/uploads/${localFileName}`;

      return {
        fileUrl,
        s3Key,
        fileName: originalName,
        fileSizeBytes: buffer.length,
        mimeType,
        storageType: "local",
      };
    }
  }
}

export const s3Service = new S3StorageService();
