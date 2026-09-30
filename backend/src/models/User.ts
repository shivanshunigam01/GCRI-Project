import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "Admin" | "Assessor" | "MembershipApprover";
export type UserStatus = "Active" | "Deactivated";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  companyId?: Types.ObjectId;
  mfa: {
    enabled: boolean;
    secret?: string;
    recoveryCodes?: string[];
  };
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["Admin", "Assessor", "MembershipApprover"],
      default: "Assessor",
      index: true,
    },
    status: {
      type: String,
      enum: ["Active", "Deactivated"],
      default: "Active",
      index: true,
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    mfa: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
      recoveryCodes: [{ type: String }],
    },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
