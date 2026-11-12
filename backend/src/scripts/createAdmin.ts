import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { Company } from "../models/Company.js";
import { AssessmentSession } from "../models/AssessmentSession.js";

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

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

    // 10 reusable recovery codes
    const recoveryCodes = [
      "12345678", "87654321", "11223344", "55667788", "99001122",
      "22334455", "66778899", "33445566", "77889900", "44556677"
    ];
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, saltRounds))
    );

    // Migrate any legacy roles in database to canonical role names
    await User.updateMany({ role: "Admin" as any }, { $set: { role: "TenantAdmin" } });
    await User.updateMany(
      { role: { $in: ["Assessor", "MembershipApprover"] as any } },
      { $set: { role: "Auditor" } }
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

    // 2. Provision Default Active Tenant & TenantAdmin Account
    let defaultTenant = await Tenant.findOne({ slug: "default-gcrai-tenant" });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: "Default GCRAI Tenant",
        slug: "default-gcrai-tenant",
        status: "Active",
        createdBy: superAdminUser._id,
      });
      console.log(`✅ Default Tenant created!`);
    } else if (defaultTenant.status !== "Active") {
      defaultTenant.status = "Active";
      await defaultTenant.save();
    }

    const tenantAdminEmail = (process.env.TENANT_ADMIN_EMAIL || "tenantadmin@graice.io").toLowerCase();
    const tenantAdminPassword = process.env.TENANT_ADMIN_PASSWORD || "TenantAdmin@123456";
    const tenantAdminHash = await bcrypt.hash(tenantAdminPassword, saltRounds);

    let tenantAdminUser = await User.findOne({ email: tenantAdminEmail });
    if (tenantAdminUser) {
      tenantAdminUser.passwordHash = tenantAdminHash;
      tenantAdminUser.role = "TenantAdmin";
      tenantAdminUser.tenantId = defaultTenant._id;
      tenantAdminUser.status = "Active";
      tenantAdminUser.name = "Default Tenant Admin";
      tenantAdminUser.loginAttempts = 0;
      tenantAdminUser.lockUntil = undefined;
      tenantAdminUser.mfa = {
        enabled: true,
        recoveryCodes: hashedRecoveryCodes,
      };
      await tenantAdminUser.save();
      console.log(`✅ TenantAdmin account updated!`);
    } else {
      tenantAdminUser = await User.create({
        email: tenantAdminEmail,
        passwordHash: tenantAdminHash,
        name: "Default Tenant Admin",
        role: "TenantAdmin",
        tenantId: defaultTenant._id,
        status: "Active",
        mfa: {
          enabled: true,
          recoveryCodes: hashedRecoveryCodes,
        },
      });
      console.log(`✅ New TenantAdmin account created!`);
    }

    defaultTenant.firstTenantAdminId = tenantAdminUser._id;
    await defaultTenant.save();

    await TenantMembership.findOneAndUpdate(
      { tenantId: defaultTenant._id, userId: tenantAdminUser._id },
      {
        tenantId: defaultTenant._id,
        userId: tenantAdminUser._id,
        role: "TenantAdmin",
        status: "Active",
        invitedBy: superAdminUser._id,
        acceptedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 3. Provision / update standard Auditor account for seamless 1-click testing (no MFA needed)
    const auditorEmail = "auditor@graice.io";
    const auditorPassword = "Auditor@123456";
    const auditorHash = await bcrypt.hash(auditorPassword, saltRounds);

    let auditorUser = await User.findOne({ email: auditorEmail });
    if (auditorUser) {
      auditorUser.passwordHash = auditorHash;
      auditorUser.role = "Auditor";
      auditorUser.tenantId = defaultTenant._id;
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
        role: "Auditor",
        tenantId: defaultTenant._id,
        status: "Active",
        mfa: { enabled: false },
      });
      console.log(`✅ New Auditor account created!`);
    }

    await TenantMembership.findOneAndUpdate(
      { tenantId: defaultTenant._id, userId: auditorUser._id },
      {
        tenantId: defaultTenant._id,
        userId: auditorUser._id,
        role: "Auditor",
        status: "Active",
        invitedBy: tenantAdminUser._id,
        acceptedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 4. Provision / Update Auditor Account for yashnawgiri45@gmail.com
    const yashEmail = "yashnawgiri45@gmail.com";
    const yashPassword = "Password@123";
    const yashHash = await bcrypt.hash(yashPassword, saltRounds);

    let yashUser = await User.findOne({ email: yashEmail });
    if (yashUser) {
      yashUser.passwordHash = yashHash;
      yashUser.role = "Auditor";
      yashUser.tenantId = defaultTenant._id;
      yashUser.status = "Active";
      yashUser.name = yashUser.name || "Yash Nawgiri";
      yashUser.loginAttempts = 0;
      yashUser.lockUntil = undefined;
      yashUser.mfa = { enabled: false };
      await yashUser.save();
      console.log(`✅ Auditor account (${yashEmail}) updated!`);
    } else {
      yashUser = await User.create({
        email: yashEmail,
        passwordHash: yashHash,
        name: "Yash Nawgiri",
        role: "Auditor",
        tenantId: defaultTenant._id,
        status: "Active",
        mfa: { enabled: false },
      });
      console.log(`✅ New Auditor account (${yashEmail}) created!`);
    }

    await TenantMembership.findOneAndUpdate(
      { tenantId: defaultTenant._id, userId: yashUser._id },
      {
        tenantId: defaultTenant._id,
        userId: yashUser._id,
        role: "Auditor",
        status: "Active",
        invitedBy: tenantAdminUser._id,
        acceptedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Backfill tenantId on existing Company and AssessmentSession records if missing
    await Company.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: defaultTenant._id } }
    );
    await AssessmentSession.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: defaultTenant._id } }
    );

    console.log("-----------------------------------------");
    console.log("Credentials:");
    console.log(`Super Admin (Global Scope):`);
    console.log(`Email:         ${superAdminEmail}`);
    console.log(`Password:      ${superAdminPassword}`);
    console.log(`Role:          ${superAdminUser.role}`);
    console.log(`MFA Recovery:  12345678 (or any in pool)`);
    console.log("-----------------------------------------");
    console.log(`Tenant Admin (Default GCRAI Tenant):`);
    console.log(`Email:         ${tenantAdminEmail}`);
    console.log(`Password:      ${tenantAdminPassword}`);
    console.log(`Role:          ${tenantAdminUser.role}`);
    console.log(`MFA Recovery:  12345678 (or any in pool)`);
    console.log("-----------------------------------------");
    console.log("Auditor (Direct Login - No MFA):");
    console.log(`Email:         ${auditorEmail}`);
    console.log(`Password:      ${auditorPassword}`);
    console.log(`Role:          ${auditorUser.role}`);
    console.log("-----------------------------------------");

    // Also list all existing users so the user has full visibility
    const allUsers = await User.find({}, "email role name status tenantId companyId").lean();
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
