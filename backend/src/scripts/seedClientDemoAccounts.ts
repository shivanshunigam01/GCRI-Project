/**
 * Seeds SuperAdmin, Admin, and Assessor (Auditor) accounts for client sharing.
 * Emails include "gcrai" in the username (local part).
 *
 * Run: npx tsx src/scripts/seedClientDemoAccounts.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";

dotenv.config();

type SeedAccount = {
  email: string;
  password: string;
  name: string;
  role: "SuperAdmin" | "Admin" | "Assessor";
  recoveryCodes: string[];
  assignCompany: boolean;
};

/**
 * Note: login schema requires a real email (must contain @).
 * Client-facing shorthand "gcrai.superadmin.com" maps to gcrai.superadmin@gcrai.com
 */
const ACCOUNTS: SeedAccount[] = [
  {
    email: "gcrai.superadmin@gcrai.com",
    password: "GcraiSuper@2026!",
    name: "GCRAI Super Administrator",
    role: "SuperAdmin",
    recoveryCodes: [
      "GCRAI-SA-481920",
      "GCRAI-SA-739104",
      "GCRAI-SA-265883",
      "GCRAI-SA-904572",
      "GCRAI-SA-118346",
      "GCRAI-SA-557291",
      "GCRAI-SA-683047",
      "GCRAI-SA-320658",
    ],
    assignCompany: false,
  },
  {
    email: "gcrai.admin@gcrai.com",
    password: "GcraiAdmin@2026!",
    name: "GCRAI Organization Admin",
    role: "Admin",
    recoveryCodes: [
      "GCRAI-AD-819204",
      "GCRAI-AD-401937",
      "GCRAI-AD-672580",
      "GCRAI-AD-953146",
      "GCRAI-AD-228761",
      "GCRAI-AD-594308",
      "GCRAI-AD-736019",
      "GCRAI-AD-185472",
    ],
    assignCompany: true,
  },
  {
    email: "gcrai.auditor@gcrai.com",
    password: "GcraiAuditor@2026!",
    name: "GCRAI Certified Auditor",
    role: "Assessor",
    /** Assessor: no MFA / no recovery codes — direct password login */
    recoveryCodes: [],
    assignCompany: true,
  },
];

async function upsertAccount(
  account: SeedAccount,
  companyId: mongoose.Types.ObjectId | undefined,
  saltRounds: number
) {
  const passwordHash = await bcrypt.hash(account.password, saltRounds);
  const requiresMfa = account.role === "SuperAdmin" || account.role === "Admin";
  const hashedRecoveryCodes = requiresMfa
    ? await Promise.all(account.recoveryCodes.map((code) => bcrypt.hash(code, saltRounds)))
    : [];

  const existing = await User.findOne({ email: account.email.toLowerCase() });
  const payload = {
    email: account.email.toLowerCase(),
    passwordHash,
    name: account.name,
    role: account.role,
    status: "Active" as const,
    authProvider: "credentials" as const,
    loginAttempts: 0,
    lockUntil: undefined as Date | undefined,
    companyId: account.assignCompany ? companyId : undefined,
    mfa: {
      enabled: requiresMfa,
      secret: undefined as string | undefined,
      tempSecret: undefined as string | undefined,
      recoveryCodes: hashedRecoveryCodes,
    },
  };

  if (existing) {
    existing.passwordHash = payload.passwordHash;
    existing.name = payload.name;
    existing.role = payload.role;
    existing.status = payload.status;
    existing.authProvider = payload.authProvider;
    existing.loginAttempts = 0;
    existing.lockUntil = undefined;
    existing.mfa = payload.mfa;
    if (account.assignCompany) {
      existing.companyId = companyId;
    } else {
      existing.companyId = undefined;
    }
    await existing.save();
    return { user: existing, created: false };
  }

  const user = await User.create(payload);
  return { user, created: true };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in backend/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.\n");

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

  let company =
    (await Company.findOne({ name: "GitHub Enterprise Org" })) ||
    (await Company.findOne({ status: "Active" }).sort({ createdAt: 1 }));
  if (!company) {
    company = await Company.create({
      name: "GitHub Enterprise Org",
      domain: "github-enterprise.example",
      industry: "Technology",
      country: "United States",
      status: "Active",
      verificationStatus: "Verified",
      activePlan: "Gold",
    });
    console.log(`Created demo company: ${company.name} (${company._id})\n`);
  } else {
    console.log(`Using existing company: ${company.name} (${company._id})\n`);
  }

  // Deactivate previous demo emails so clients only use the new @gcrai.com accounts
  const legacyEmails = [
    "gcrai.superadmin@graice.io",
    "gcrai.admin@graice.io",
    "gcrai.auditor@graice.io",
  ];
  await User.updateMany(
    { email: { $in: legacyEmails } },
    { $set: { status: "Deactivated" } }
  );

  const results: Array<{
    role: string;
    email: string;
    password: string;
    recoveryCodes: string[];
    company?: string;
    action: string;
  }> = [];

  for (const account of ACCOUNTS) {
    const { user, created } = await upsertAccount(account, company._id, saltRounds);
    results.push({
      role: user.role,
      email: account.email,
      password: account.password,
      recoveryCodes: account.recoveryCodes,
      company: account.assignCompany ? company.name : "Platform-wide (none)",
      action: created ? "CREATED" : "UPDATED",
    });
    console.log(`${created ? "✅ Created" : "♻️  Updated"} ${account.role}: ${account.email}`);
  }

  console.log("\n============================================================");
  console.log("  GCRAI CLIENT DEMO ACCOUNTS — SHARE WITH CLIENT");
  console.log("============================================================");
  console.log("Admin / SuperAdmin: MFA required — use a recovery code when prompted.");
  console.log("Auditor (Assessor): password-only login (no MFA / no recovery codes).");
  console.log("------------------------------------------------------------\n");

  for (const r of results) {
    console.log(`ROLE:     ${r.role}  [${r.action}]`);
    console.log(`EMAIL:    ${r.email}`);
    console.log(`PASSWORD: ${r.password}`);
    console.log(`ORG:      ${r.company}`);
    if (r.recoveryCodes.length) {
      console.log(`RECOVERY CODES (single-use):`);
      r.recoveryCodes.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
    } else {
      console.log(`RECOVERY CODES: N/A (MFA not required for Auditor)`);
    }
    console.log("------------------------------------------------------------\n");
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
