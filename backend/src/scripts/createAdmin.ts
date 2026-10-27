import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { User } from "../models/User.js";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function createAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const email = (process.env.ADMIN_EMAIL || "admin@graice.io").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin@123456";
    const name = process.env.ADMIN_NAME || "System Administrator";

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 10 reusable recovery codes
    const recoveryCodes = [
      "12345678", "87654321", "11223344", "55667788", "99001122",
      "22334455", "66778899", "33445566", "77889900", "44556677"
    ];
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, saltRounds))
    );

    // 1. Provision / Update Super Admin Account (Global Platform Owner)
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "superadmin@graice.io").toLowerCase();
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123456";
    const superAdminName = process.env.SUPER_ADMIN_NAME || "Super Administrator";
    const superAdminHash = await bcrypt.hash(superAdminPassword, saltRounds);

    let superAdminUser = await User.findOne({ email: superAdminEmail });
    if (superAdminUser) {
      superAdminUser.passwordHash = superAdminHash;
      superAdminUser.role = "SuperAdmin";
      superAdminUser.status = "Active";
      superAdminUser.name = superAdminName;
      superAdminUser.loginAttempts = 0;
      superAdminUser.lockUntil = undefined;
      superAdminUser.mfa = {
        enabled: true,
        recoveryCodes: hashedRecoveryCodes,
      };
      await superAdminUser.save();
      console.log(`✅ Super Admin account updated!`);
    } else {
      superAdminUser = await User.create({
        email: superAdminEmail,
        passwordHash: superAdminHash,
        name: superAdminName,
        role: "SuperAdmin",
        status: "Active",
        mfa: {
          enabled: true,
          recoveryCodes: hashedRecoveryCodes,
        },
      });
      console.log(`✅ New Super Admin account created!`);
    }

    // Also migrate existing admin@graice.io to SuperAdmin if present so previous logins continue working
    const legacyAdmin = await User.findOne({ email: "admin@graice.io" });
    if (legacyAdmin && legacyAdmin._id.toString() !== superAdminUser._id.toString()) {
      legacyAdmin.role = "SuperAdmin";
      await legacyAdmin.save();
      console.log(`✅ Upgraded legacy admin@graice.io to SuperAdmin.`);
    }

    // 2. Also provision/update a standard Auditor account for seamless 1-click testing (no MFA needed)
    const auditorEmail = "auditor@graice.io";
    const auditorPassword = "Auditor@123456";
    const auditorHash = await bcrypt.hash(auditorPassword, saltRounds);

    let auditorUser = await User.findOne({ email: auditorEmail });
    if (auditorUser) {
      auditorUser.passwordHash = auditorHash;
      auditorUser.role = "Assessor";
      auditorUser.status = "Active";
      auditorUser.name = "Piyush Napit";
      auditorUser.loginAttempts = 0;
      auditorUser.lockUntil = undefined;
      auditorUser.mfa = { enabled: false };
      await auditorUser.save();
      console.log(`✅ Auditor account updated!`);
    } else {
      auditorUser = await User.create({
        email: auditorEmail,
        passwordHash: auditorHash,
        name: "Piyush Napit",
        role: "Assessor",
        status: "Active",
        mfa: { enabled: false },
      });
      console.log(`✅ New Auditor account created!`);
    }

    console.log("-----------------------------------------");
    console.log("Credentials:");
    console.log(`Super Admin (Global Scope):`);
    console.log(`Email:         ${superAdminEmail}`);
    console.log(`Password:      ${superAdminPassword}`);
    console.log(`Role:          ${superAdminUser.role}`);
    console.log(`MFA Recovery:  12345678 (or any in pool)`);
    console.log("-----------------------------------------");
    console.log("Auditor (Direct Login - No MFA):");
    console.log(`Email:         ${auditorEmail}`);
    console.log(`Password:      ${auditorPassword}`);
    console.log(`Role:          ${auditorUser.role}`);
    console.log("-----------------------------------------");

    // Also list all existing users so the user has full visibility
    const allUsers = await User.find({}, "email role name status companyId").lean();
    console.log("\nAll registered users in database:");
    console.table(allUsers);
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

createAdmin();
