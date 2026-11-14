import { Schema, model, Document, Types } from "mongoose";

export type TenantStatus = "Pending" | "Active" | "Suspended" | "Retired";

export interface ITenant extends Document {
  name: string;
  slug: string;
  status: TenantStatus;
  createdBy: Types.ObjectId;
  firstTenantAdminId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["Pending", "Active", "Suspended", "Retired"],
      default: "Pending",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    firstTenantAdminId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

TenantSchema.index({ name: 1 });

export const Tenant = model<ITenant>("Tenant", TenantSchema);

