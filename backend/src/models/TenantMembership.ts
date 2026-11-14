import { Schema, model, Document, Types } from "mongoose";

export type TenantMemberRole = "TenantAdmin" | "Auditor";
export type TenantMembershipStatus = "Invited" | "Active" | "Deactivated";

export interface ITenantMembership extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  role: TenantMemberRole;
  status: TenantMembershipStatus;
  invitedBy?: Types.ObjectId;
  invitationToken?: string;
  invitationExpires?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TenantMembershipSchema = new Schema<ITenantMembership>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["TenantAdmin", "Auditor"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Invited", "Active", "Deactivated"],
      default: "Invited",
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitationToken: { type: String, index: true },
    invitationExpires: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure a user has at most one membership record per tenant
TenantMembershipSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
TenantMembershipSchema.index({ userId: 1, status: 1 });
TenantMembershipSchema.index({ tenantId: 1, role: 1, status: 1 });

export const TenantMembership = model<ITenantMembership>(
  "TenantMembership",
  TenantMembershipSchema
);

