import { Schema, model, Document, Types } from "mongoose";

export interface IApiKey extends Document {
  name: string;
  prefix: string;
  keyHash: string;
  companyId: Types.ObjectId;
  role: "Admin" | "Assessor" | "ReadOnly";
  permissions: string[];
  expiresAt?: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true, trim: true },
    prefix: { type: String, required: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    role: {
      type: String,
      enum: ["Admin", "Assessor", "ReadOnly"],
      default: "ReadOnly",
    },
    permissions: [{ type: String }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

export const ApiKey = model<IApiKey>("ApiKey", ApiKeySchema);
