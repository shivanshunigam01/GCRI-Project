import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "SuperAdmin" | "Admin" | "Assessor" | "MembershipApprover";
export type UserStatus = "Active" | "Deactivated";

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  companyId?: Types.ObjectId;
  authProvider?: "credentials" | "google" | "microsoft";
  oauthId?: string;
  mfa: {
    enabled: boolean;
    secret?: string;
    tempSecret?: string;
    recoveryCodes?: string[];
  };
  invitationToken?: string;
  invitationExpires?: Date;
  invitedBy?: Types.ObjectId;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Assessor", "MembershipApprover"],
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
    authProvider: {
      type: String,
      enum: ["credentials", "google", "microsoft"],
      default: "credentials",
      index: true,
    },
    oauthId: { type: String, index: true },
    mfa: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
      tempSecret: { type: String },
      recoveryCodes: [{ type: String }],
    },
    invitationToken: { type: String, index: true },
    invitationExpires: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
