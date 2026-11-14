import { Schema, model, Document, Types } from "mongoose";

export type CompanyStatus = "Active" | "Suspended";
export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Bronze" | "Silver" | "Gold";

export interface ICompanyImageAsset {
  url: string;
  publicId: string;
}

export interface ICompanyPrimaryContact {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ICompany extends Document {
  name: string;
  domain: string;
  registrationNumber?: string;
  country?: string;
  industry?: string;
  size?: string;
  primaryContact?: ICompanyPrimaryContact;
  tenantId?: Types.ObjectId;
  activePlan?: SubscriptionTier;
  verificationStatus: VerificationStatus;
  status: CompanyStatus;
  /** Optional organization logo stored on Cloudinary */
  logo?: ICompanyImageAsset;
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
    primaryContact: {
      _id: false,
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", index: true },
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
    logo: {
      _id: false,
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
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
