import { Schema, model, Document, Types } from "mongoose";

export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Bronze" | "Silver" | "Gold";

export interface ICompany extends Document {
  tenantId: Types.ObjectId;
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  activePlan?: SubscriptionTier;
  verificationStatus: VerificationStatus;
  status: CompanyStatus;
  createdBy?: Types.ObjectId;
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
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true, index: true },
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
CompanySchema.index({ tenantId: 1, domain: 1 }, { unique: true });

export const Company = model<ICompany>("Company", CompanySchema);
