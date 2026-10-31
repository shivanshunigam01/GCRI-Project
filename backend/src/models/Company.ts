import { Schema, model, Document } from "mongoose";

export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Bronze" | "Silver" | "Gold";

export interface ICompany extends Document {
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  activePlan?: SubscriptionTier;
  verificationStatus: VerificationStatus;
  status: CompanyStatus;
  verificationAuditTrail?: {
    verifiedAt?: Date;
    verifiedBy?: string;
    notes?: string;
    dnsCheckResult?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true, unique: true },
    registrationNumber: { type: String, trim: true },
    country: { type: String, trim: true },
    industry: { type: String, trim: true },
    size: { type: String, trim: true },
    activePlan: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      default: "Bronze",
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ["Verified", "Pending", "Rejected"],
      default: "Pending",
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
      index: true,
    },
    verificationAuditTrail: {
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
      notes: { type: String },
      dnsCheckResult: { type: Boolean },
    },
  },
  { timestamps: true }
);

CompanySchema.index({ name: 1 });

export const Company = model<ICompany>("Company", CompanySchema);
