import { Schema, model, Document, Types } from "mongoose";

export type MappingStatus = "Active" | "Inactive";

export interface IAuditorOrganization extends Document {
  organizationId: Types.ObjectId;
  auditorId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  status: MappingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AuditorOrganizationSchema = new Schema<IAuditorOrganization>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    auditorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true },
  },
  { timestamps: true }
);

// Compound index to guarantee an auditor cannot be duplicate-mapped to the same organization
AuditorOrganizationSchema.index({ organizationId: 1, auditorId: 1 }, { unique: true });
AuditorOrganizationSchema.index({ auditorId: 1, status: 1 });
AuditorOrganizationSchema.index({ organizationId: 1, status: 1 });

export const AuditorOrganization = model<IAuditorOrganization>(
  "AuditorOrganization",
  AuditorOrganizationSchema
);
