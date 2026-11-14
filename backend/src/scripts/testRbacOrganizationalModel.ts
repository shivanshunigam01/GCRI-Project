import express from "express";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import http from "node:http";
import { Duplex } from "node:stream";

import v1Routes from "../routes/index.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { User } from "../models/User.js";
import { Tenant } from "../models/Tenant.js";
import { TenantMembership } from "../models/TenantMembership.js";
import { Company } from "../models/Company.js";
import { AssessmentSession } from "../models/AssessmentSession.js";
import { AssessmentFramework } from "../models/AssessmentFramework.js";
import { AuditLog } from "../models/AuditLog.js";
import { AuditorOrganization } from "../models/AuditorOrganization.js";
import { ApiKey } from "../models/ApiKey.js";
import { WebhookSubscription } from "../models/WebhookSubscription.js";
import {
  CreateTenantSchema,
  UpdateTenantStatusSchema,
} from "../schemas/tenant.schema.js";
import { InviteUserSchema } from "../schemas/user.schema.js";
import { CreateCompanySchema } from "../schemas/company.schema.js";
import {
  ShareAssessmentSchema,
  CoSignAssessmentSchema,
} from "../schemas/assessment.schema.js";
import dns from "node:dns/promises";
import { emailService } from "../services/email.service.js";

process.env.JWT_SECRET = "test-rbac-jwt-secret-key-2026";
process.env.BCRYPT_SALT_ROUNDS = "4"; // fast hashing for tests

// ============================================================================
// In-Memory Mongoose Collection Adapter (for sandboxed execution without DB)
// ============================================================================
function installInMemoryMongooseAdapter() {
  const stores = new Map<string, any[]>();
  const modelMap = new Map<string, mongoose.Model<any>>();

  const models: Array<[string, mongoose.Model<any>]> = [
    ["User", User],
    ["Tenant", Tenant],
    ["TenantMembership", TenantMembership],
    ["Company", Company],
    ["AssessmentSession", AssessmentSession],
    ["AssessmentFramework", AssessmentFramework],
    ["AuditLog", AuditLog],
    ["AuditorOrganization", AuditorOrganization],
    ["ApiKey", ApiKey],
    ["WebhookSubscription", WebhookSubscription],
  ];

  for (const [name, model] of models) {
    stores.set(name, []);
    modelMap.set(name, model);
  }

  function getValueByPath(obj: any, path: string): any {
    const parts = path.split(".");
    let cur = obj;
    for (const part of parts) {
      if (cur == null) return undefined;
      if (Array.isArray(cur)) {
        return cur.map((item) => getValueByPath(item, parts.slice(parts.indexOf(part)).join(".")));
      }
      cur = cur[part];
    }
    return cur;
  }

  function normalizeVal(v: any): any {
    if (v instanceof Types.ObjectId) return v.toString();
    if (v && typeof v === "object" && v._id instanceof Types.ObjectId) return v._id.toString();
    return v;
  }

  function matchesFilter(doc: any, filter: Record<string, any> = {}): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    for (const [key, cond] of Object.entries(filter)) {
      if (key === "$or" && Array.isArray(cond)) {
        if (!cond.some((sub) => matchesFilter(doc, sub))) return false;
        continue;
      }
      if (key === "$and" && Array.isArray(cond)) {
        if (!cond.every((sub) => matchesFilter(doc, sub))) return false;
        continue;
      }

      const rawVal = getValueByPath(doc, key);
      const val = Array.isArray(rawVal) ? rawVal.map(normalizeVal) : normalizeVal(rawVal);

      if (cond instanceof RegExp) {
        if (!cond.test(String(val ?? ""))) return false;
        continue;
      }

      if (
        cond !== null &&
        typeof cond === "object" &&
        !(cond instanceof Types.ObjectId) &&
        !(cond instanceof Date)
      ) {
        if ("$in" in cond) {
          const targetList = (cond.$in as any[]).map(normalizeVal);
          if (Array.isArray(val)) {
            if (!val.some((v) => targetList.includes(v))) return false;
          } else {
            if (!targetList.includes(val)) return false;
          }
        }
        if ("$ne" in cond) {
          const neVal = normalizeVal(cond.$ne);
          if (val === neVal) return false;
        }
        if ("$exists" in cond) {
          const exists = rawVal !== undefined && rawVal !== null;
          if (Boolean(cond.$exists) !== exists) return false;
        }
        if ("$regex" in cond) {
          const re = new RegExp(cond.$regex, cond.$options || "");
          if (!re.test(String(val ?? ""))) return false;
        }
        if ("$gte" in cond) {
          if (new Date(rawVal).getTime() < new Date(cond.$gte).getTime()) return false;
        }
        if ("$lte" in cond) {
          if (new Date(rawVal).getTime() > new Date(cond.$lte).getTime()) return false;
        }
        if ("$gt" in cond) {
          const left = rawVal instanceof Date ? rawVal.getTime() : Number(rawVal);
          const right = cond.$gt instanceof Date ? cond.$gt.getTime() : Number(cond.$gt);
          if (!(left > right)) return false;
        }
        continue;
      }

      const target = normalizeVal(cond);
      if (Array.isArray(val)) {
        if (!val.includes(target)) return false;
      } else if (val !== target) {
        return false;
      }
    }
    return true;
  }

  function createQueryChain(modelName: string, initialResultGetter: () => any, isSingle = false) {
    let sortSpec: Record<string, 1 | -1> | null = null;
    let skipCount = 0;
    let limitCount: number | null = null;
    const populates: Array<{ path: string; select?: string }> = [];

    const execute = async () => {
      let res = initialResultGetter();
      if (isSingle) {
        if (!res) return null;
        return applyPopulate(res, populates);
      }
      let list = [...res];
      if (sortSpec) {
        const entries = Object.entries(sortSpec);
        list.sort((a, b) => {
          for (const [k, dir] of entries) {
            const av = a[k] instanceof Date ? a[k].getTime() : a[k] ?? "";
            const bv = b[k] instanceof Date ? b[k].getTime() : b[k] ?? "";
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
          }
          return 0;
        });
      }
      if (skipCount > 0) list = list.slice(skipCount);
      if (limitCount !== null) list = list.slice(0, limitCount);
      return Promise.all(list.map((item) => applyPopulate(item, populates)));
    };

    const refMap: Record<string, string> = {
      tenantId: "Tenant",
      companyId: "Company",
      organizationId: "Company",
      userId: "User",
      auditorId: "User",
      actorId: "User",
      createdBy: "User",
      invitedBy: "User",
      assignedBy: "User",
      firstTenantAdminId: "User",
      createdByUserId: "User",
      conductedByUserId: "User",
      "sharedWith.auditorId": "User",
    };

    async function applyPopulate(doc: any, _pops: Array<{ path: string; select?: string }>) {
      return doc;
    }

    const chain: any = {
      sort(spec: Record<string, 1 | -1>) {
        sortSpec = spec;
        return chain;
      },
      skip(n: number) {
        skipCount = n;
        return chain;
      },
      limit(n: number) {
        limitCount = n;
        return chain;
      },
      select(_fields: string) {
        return chain;
      },
      populate(path: string, select?: string) {
        populates.push({ path, select });
        return chain;
      },
      lean() {
        return chain;
      },
      then(resolve: any, reject: any) {
        return execute().then(resolve, reject);
      },
      catch(reject: any) {
        return execute().catch(reject);
      },
    };
    return chain;
  }

  for (const [name, Model] of models) {
    const store = stores.get(name)!;

    // Attach custom save to prototype
    Model.prototype.save = async function () {
      await this.validate();
      if (!this._id) this._id = new Types.ObjectId();
      const now = new Date();
      if (!this.createdAt) this.createdAt = now;
      this.updatedAt = now;

      const idx = store.findIndex((d) => d._id.toString() === this._id.toString());
      if (idx >= 0) {
        store[idx] = this;
      } else {
        store.push(this);
      }
      return this;
    };

    (Model as any).create = async function (data: any) {
      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          const doc = new Model(item);
          await doc.save();
          results.push(doc);
        }
        return results;
      }
      const doc = new Model(data);
      await doc.save();
      return doc;
    };

    (Model as any).find = function (filter: Record<string, any> = {}) {
      return createQueryChain(
        name,
        () => store.filter((doc) => matchesFilter(doc, filter)),
        false
      );
    };

    (Model as any).findOne = function (filter: Record<string, any> = {}) {
      return createQueryChain(
        name,
        () => store.find((doc) => matchesFilter(doc, filter)) || null,
        true
      );
    };

    (Model as any).findById = function (id: any) {
      const idStr = normalizeVal(id);
      return createQueryChain(
        name,
        () => store.find((doc) => doc._id.toString() === idStr) || null,
        true
      );
    };

    (Model as any).findByIdAndUpdate = function (id: any, update: any, opts: any = {}) {
      return createQueryChain(
        name,
        () => {
          const idStr = normalizeVal(id);
          const doc = store.find((d) => d._id.toString() === idStr);
          if (!doc) return null;
          const payload = update.$set || update;
          for (const [k, v] of Object.entries(payload)) {
            if (k !== "$set") (doc as any)[k] = v;
          }
          doc.updatedAt = new Date();
          return opts.new !== false ? doc : doc;
        },
        true
      );
    };

    (Model as any).findOneAndUpdate = function (filter: any, update: any, opts: any = {}) {
      return createQueryChain(
        name,
        () => {
          let doc = store.find((d) => matchesFilter(d, filter));
          if (!doc && opts.upsert) {
            const payload = { ...filter, ...(update.$set || update) };
            doc = new Model(payload);
            doc._id = new Types.ObjectId();
            doc.createdAt = new Date();
            doc.updatedAt = new Date();
            store.push(doc);
            return doc;
          }
          if (!doc) return null;
          const payload = update.$set || update;
          for (const [k, v] of Object.entries(payload)) {
            if (k !== "$set") (doc as any)[k] = v;
          }
          doc.updatedAt = new Date();
          return doc;
        },
        true
      );
    };

    (Model as any).findByIdAndDelete = async function (id: any) {
      const idStr = normalizeVal(id);
      const idx = store.findIndex((d) => d._id.toString() === idStr);
      if (idx >= 0) {
        const [removed] = store.splice(idx, 1);
        return removed;
      }
      return null;
    };

    (Model as any).countDocuments = async function (filter: Record<string, any> = {}) {
      return store.filter((doc) => matchesFilter(doc, filter)).length;
    };

    (Model as any).distinct = async function (field: string, filter: Record<string, any> = {}) {
      const matched = store.filter((doc) => matchesFilter(doc, filter));
      return Array.from(new Set(matched.map((d) => d[field]).filter((v) => v !== undefined)));
    };

    (Model as any).aggregate = async function (pipeline: any[]) {
      let docs = [...store];
      for (const stage of pipeline) {
        if (stage.$match) {
          docs = docs.filter((d) => matchesFilter(d, stage.$match));
        } else if (stage.$group) {
          const groupKey = stage.$group._id.replace(/^\$/, "");
          const counts = new Map<any, number>();
          for (const d of docs) {
            const k = d[groupKey];
            counts.set(k, (counts.get(k) || 0) + 1);
          }
          docs = Array.from(counts.entries()).map(([k, count]) => ({ _id: k, count }));
        } else if (stage.$sort) {
          const [k, dir] = Object.entries(stage.$sort)[0] as [string, number];
          docs.sort((a, b) => (a[k] - b[k]) * dir);
        } else if (stage.$limit) {
          docs = docs.slice(0, stage.$limit);
        }
      }
      return docs;
    };
  }
}

// ============================================================================
// Stub external network services (DNS & Email) for deterministic testing
// ============================================================================
(dns as any).resolve4 = async () => ["93.184.216.34"];
(dns as any).resolveMx = async (domain: string) => [{ exchange: `mail.${domain}`, priority: 10 }];

emailService.sendUserInvitation = async () => true as any;
emailService.sendAdminNewCompanyAlert = async () => true as any;
emailService.sendAdminDomainAlert = async () => true as any;
emailService.sendPasswordReset = async () => true as any;

// ============================================================================
// Test Runner Helper
// ============================================================================
interface TestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let testCounter = 0;

async function runTest(category: string, name: string, fn: () => Promise<void> | void) {
  const id = ++testCounter;
  try {
    await fn();
    results.push({ id, category, name, passed: true });
    console.log(`  ✅ [PASS #${id}] ${name}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    results.push({ id, category, name, passed: false, error: msg });
    console.error(`  ❌ [FAIL #${id}] ${name}\n     Reason: ${msg}`);
  }
}

async function apiRequest(
  appInstance: express.Express,
  method: string,
  path: string,
  options: {
    token?: string;
    tenantIdHeader?: string;
    body?: any;
  } = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const mockSocket = new Duplex({
      read() { },
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    (mockSocket as any).remoteAddress = "127.0.0.1";

    const req = new http.IncomingMessage(mockSocket as any);
    req.method = method.toUpperCase();
    req.url = `/api/v1${path}`;
    req.headers = {
      "content-type": "application/json",
      "x-test-suite": "graice-internal-test",
    };
    if (options.token) {
      req.headers["authorization"] = `Bearer ${options.token}`;
    }
    if (options.tenantIdHeader) {
      req.headers["x-tenant-id"] = options.tenantIdHeader;
    }

    // Pre-populate body so express.json() or routes can read it directly
    (req as any).body = options.body ? JSON.parse(JSON.stringify(options.body)) : {};
    (req as any)._body = true;
    req.push(null);

    const res = new http.ServerResponse(req);
    res.assignSocket(mockSocket as any);

    let responseBody: any = {};
    const origJson = (res as any).json;
    (res as any).json = function (data: any) {
      responseBody = JSON.parse(JSON.stringify(data));
      resolve({ status: res.statusCode, body: responseBody });
      return origJson ? origJson.call(this, data) : this;
    };

    const origEnd = res.end.bind(res);
    (res as any).end = function (chunk?: any, encoding?: any, cb?: any) {
      if (chunk && Object.keys(responseBody).length === 0) {
        try {
          const str = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
          responseBody = JSON.parse(str);
        } catch {
          responseBody = { raw: String(chunk) };
        }
      }
      resolve({ status: res.statusCode, body: responseBody });
      return origEnd(chunk, encoding, cb);
    };

    try {
      appInstance(req as any, res as any);
    } catch (err) {
      reject(err);
    }
  });
}

function signTestJwt(payload: {
  userId: string;
  email: string;
  role: "SuperAdmin" | "TenantAdmin" | "Auditor";
  tenantId?: string;
  tenantIds?: string[];
  companyId?: string;
}) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1h" });
}

// ============================================================================
// Main Test Execution
// ============================================================================
async function main() {
  console.log("================================================================================");
  console.log("  GCRAI ORGANIZATIONAL MODEL & RBAC — IN-DEPTH AUTOMATED TEST SUITE");
  console.log("================================================================================\n");

  installInMemoryMongooseAdapter();

  const app = express();
  app.use(express.json());
  app.use("/api/v1", v1Routes);
  app.use(errorHandler);
  const baseUrl = app as any;

  try {
    // ==========================================================================
    // CATEGORY 1: MONGOOSE MODELS & ZOD SCHEMA VALIDATION
    // ==========================================================================
    console.log("▶ Category 1: Mongoose Models & Zod Schema Validation");

    await runTest(
      "Models & Schemas",
      "User model accepts canonical roles ('SuperAdmin', 'TenantAdmin', 'Auditor') and rejects legacy roles ('Admin', 'Assessor', 'MembershipApprover')",
      async () => {
        for (const validRole of ["SuperAdmin", "TenantAdmin", "Auditor"] as const) {
          const u = new User({
            email: `${validRole.toLowerCase()}@test.io`,
            passwordHash: "hash123456",
            name: `Test ${validRole}`,
            role: validRole,
          });
          await u.validate();
        }

        for (const legacyRole of ["Admin", "Assessor", "MembershipApprover", "ClientOrg"]) {
          const invalidUser = new User({
            email: "legacy@test.io",
            passwordHash: "hash123456",
            name: "Legacy Role User",
            role: legacyRole as any,
          });
          await assert.rejects(
            () => invalidUser.validate(),
            `Expected legacy role '${legacyRole}' to fail validation`
          );
        }
      }
    );

    await runTest(
      "Models & Schemas",
      "Tenant model enforces lifecycle status enum ('Pending', 'Active', 'Suspended', 'Retired') and defaults to 'Pending'",
      async () => {
        const creatorId = new Types.ObjectId();
        const defaultTenant = new Tenant({
          name: "Acme Audit LLC",
          slug: "acme-audit-llc",
          createdBy: creatorId,
        });
        assert.equal(defaultTenant.status, "Pending");
        await defaultTenant.validate();

        for (const status of ["Pending", "Active", "Suspended", "Retired"] as const) {
          const t = new Tenant({
            name: `Tenant ${status}`,
            slug: `tenant-${status.toLowerCase()}`,
            status,
            createdBy: creatorId,
          });
          await t.validate();
        }

        const badTenant = new Tenant({
          name: "Bad Tenant",
          slug: "bad-tenant",
          status: "Terminated" as any,
          createdBy: creatorId,
        });
        await assert.rejects(() => badTenant.validate());
      }
    );

    await runTest(
      "Models & Schemas",
      "TenantMembership model allows only 'TenantAdmin' and 'Auditor' roles and ('Invited', 'Active', 'Deactivated') statuses",
      async () => {
        const tenantId = new Types.ObjectId();
        const userId = new Types.ObjectId();
        for (const role of ["TenantAdmin", "Auditor"] as const) {
          const m = new TenantMembership({ tenantId, userId, role, status: "Active" });
          await m.validate();
        }

        const invalidSuperAdminMembership = new TenantMembership({
          tenantId,
          userId,
          role: "SuperAdmin" as any,
        });
        await assert.rejects(() => invalidSuperAdminMembership.validate());
      }
    );

    await runTest(
      "Models & Schemas",
      "Company (Client Organization) model requires tenantId and CreateCompanySchema excludes client login creation",
      async () => {
        const missingTenantCompany = new Company({
          name: "Orphan Client Org",
          domain: "orphan.ai",
        });
        await assert.rejects(
          () => missingTenantCompany.validate(),
          "Company without tenantId must fail validation"
        );

        const validCompany = new Company({
          tenantId: new Types.ObjectId(),
          name: "Scoped Client Org",
          domain: "scoped.ai",
        });
        await validCompany.validate();

        const parsed = CreateCompanySchema.safeParse({
          body: {
            name: "Valid Client Org",
            domain: "validclient.ai",
            industry: "Healthcare",
          },
        });
        assert.equal(parsed.success, true);
      }
    );

    await runTest(
      "Models & Schemas",
      "AssessmentSession model validates tenantId, createdByUserId, sharedWith, and coSignatures",
      async () => {
        const tenantId = new Types.ObjectId();
        const companyId = new Types.ObjectId();
        const auditor1Id = new Types.ObjectId();
        const auditor2Id = new Types.ObjectId();

        const session = new AssessmentSession({
          tenantId,
          companyId,
          createdByUserId: auditor1Id,
          conductedByUserId: auditor1Id,
          frameworkVersion: "1.0.0",
          assessmentType: "Light",
          sharedWith: [
            {
              auditorId: auditor2Id,
              sharedByUserId: auditor1Id,
              sharedAt: new Date(),
            },
          ],
          coSignatures: [
            {
              auditorId: auditor2Id,
              auditorName: "Auditor Two",
              auditorEmail: "auditor2@test.io",
              signedAt: new Date(),
              attestationNotes: "Reviewed and verified.",
            },
          ],
        });
        await session.validate();
        assert.equal(session.sharedWith.length, 1);
        assert.equal(session.coSignatures.length, 1);
      }
    );

    await runTest(
      "Models & Schemas",
      "ApiKey model accepts 'TenantAdmin', 'Auditor', 'ReadOnly' and rejects legacy 'Admin'/'Assessor'",
      async () => {
        const companyId = new Types.ObjectId();
        const createdBy = new Types.ObjectId();
        for (const role of ["TenantAdmin", "Auditor", "ReadOnly"] as const) {
          const key = new ApiKey({
            name: `Key ${role}`,
            prefix: "grc_1234",
            keyHash: "abcd1234",
            companyId,
            role,
            createdBy,
          });
          await key.validate();
        }

        const badKey = new ApiKey({
          name: "Legacy Key",
          prefix: "grc_9999",
          keyHash: "abcd9999",
          companyId,
          role: "Assessor" as any,
          createdBy,
        });
        await assert.rejects(() => badKey.validate());
      }
    );

    await runTest(
      "Models & Schemas",
      "Zod request schemas validate Tenant, User Invite, Share Assessment, and Co-Sign payloads",
      () => {
        assert.equal(
          CreateTenantSchema.safeParse({ body: { name: "Alpha Tenant", slug: "alpha-tenant" } }).success,
          true
        );
        assert.equal(
          UpdateTenantStatusSchema.safeParse({
            params: { id: new Types.ObjectId().toString() },
            body: { status: "Suspended" },
          }).success,
          true
        );
        assert.equal(
          InviteUserSchema.safeParse({
            body: { email: "auditor@alpha.io", name: "Auditor One", role: "Auditor" },
          }).success,
          true
        );
        assert.equal(
          InviteUserSchema.safeParse({
            body: { email: "legacy@alpha.io", name: "Legacy", role: "Assessor" },
          }).success,
          false
        );
        assert.equal(
          ShareAssessmentSchema.safeParse({
            params: { id: new Types.ObjectId().toString() },
            body: { auditorIds: [new Types.ObjectId().toString()] },
          }).success,
          true
        );
        assert.equal(
          CoSignAssessmentSchema.safeParse({
            params: { id: new Types.ObjectId().toString() },
            body: { attestationNotes: "Co-signed after peer review" },
          }).success,
          true
        );
      }
    );

    // ==========================================================================
    // CATEGORY 2: STRICT TOP-DOWN INVITATION & TENANT LIFECYCLE
    // ==========================================================================
    console.log("\n▶ Category 2: Strict Top-Down Invitation & Tenant Lifecycle");

    // Seed SuperAdmin user & Published AssessmentFramework
    const superAdminPasswordHash = await bcrypt.hash("SuperAdmin@123456", 4);
    const superAdmin = await User.create({
      email: "superadmin@gcrai.io",
      passwordHash: superAdminPasswordHash,
      name: "GCRAI Super Admin",
      role: "SuperAdmin",
      status: "Active",
    });
    const superAdminToken = signTestJwt({
      userId: superAdmin._id.toString(),
      email: superAdmin.email,
      role: "SuperAdmin",
    });

    await AssessmentFramework.create({
      title: "GRAICE Light Assessment Framework",
      version: "1.0.0",
      assessmentType: "Light",
      status: "Published",
      totalQuestions: 1,
      pillars: [
        {
          pillarId: "ethical-leadership",
          pillarNumber: 1,
          name: "Ethical Leadership",
          description: "Governance and ethical leadership controls",
          weight: 1,
          order: 1,
        },
      ],
      questions: [
        {
          questionId: "Q-P1-01",
          pillarId: "ethical-leadership",
          pillarNumber: 1,
          pillarName: "Ethical Leadership",
          text: "Does the organization have an AI Ethics Charter?",
          mandatory: true,
          isActive: true,
          order: 1,
          responseOptions: [
            { code: "YES", label: "Yes, fully implemented", scoreValue: 4, order: 1 },
            { code: "NO", label: "No", scoreValue: 0, order: 2 },
          ],
        },
      ],
    });

    await runTest(
      "Onboarding & Invitations",
      "POST /api/v1/auth/register is disabled (403 SELF_REGISTRATION_DISABLED)",
      async () => {
        const res = await apiRequest(baseUrl, "POST", "/auth/register", {
          body: {
            email: "hacker@external.com",
            password: "Password@123",
            name: "Uninvited User",
            companyName: "External Org",
            domain: "external.com",
          },
        });
        assert.equal(res.status, 403);
        assert.equal(res.body.error?.code, "SELF_REGISTRATION_DISABLED");
      }
    );

    let tenantAId = "";
    let tenantBId = "";

    await runTest(
      "Onboarding & Invitations",
      "SuperAdmin creates Tenant A and Tenant B in 'Pending' status (POST /api/v1/tenants)",
      async () => {
        const resA = await apiRequest(baseUrl, "POST", "/tenants", {
          token: superAdminToken,
          body: { name: "Alpha Audit Partners", slug: "alpha-audit-partners" },
        });
        assert.equal(resA.status, 201);
        assert.equal(resA.body.data.tenant.status, "Pending");
        tenantAId = resA.body.data.tenant._id;

        const resB = await apiRequest(baseUrl, "POST", "/tenants", {
          token: superAdminToken,
          body: { name: "Beta Assurance Group", slug: "beta-assurance-group" },
        });
        assert.equal(resB.status, 201);
        assert.equal(resB.body.data.tenant.status, "Pending");
        tenantBId = resB.body.data.tenant._id;

        // Duplicate slug rejected with 409
        const dupRes = await apiRequest(baseUrl, "POST", "/tenants", {
          token: superAdminToken,
          body: { name: "Alpha Audit Partners", slug: "alpha-audit-partners" },
        });
        assert.equal(dupRes.status, 409);
        assert.equal(dupRes.body.error?.code, "TENANT_EXISTS");
      }
    );

    let tenantAdminAInviteToken = "";
    let tenantAdminBInviteToken = "";
    let tenantAdminAId = "";
    let tenantAdminBId = "";

    await runTest(
      "Onboarding & Invitations",
      "SuperAdmin can ONLY invite TenantAdmin (rejects direct Auditor invite with 403 HIERARCHY_VIOLATION)",
      async () => {
        // Attempt by SuperAdmin to invite Auditor directly -> 403
        const badInvite = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: superAdminToken,
          body: {
            email: "directauditor@alpha.io",
            name: "Direct Auditor",
            role: "Auditor",
            tenantId: tenantAId,
          },
        });
        assert.equal(badInvite.status, 403);
        assert.equal(badInvite.body.error?.code, "HIERARCHY_VIOLATION");

        // Attempt by SuperAdmin to invite TenantAdmin without tenantId -> 400
        const missingTenantInvite = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: superAdminToken,
          body: {
            email: "tenantadminA@alpha.io",
            name: "Alice TenantAdmin",
            role: "TenantAdmin",
          },
        });
        assert.equal(missingTenantInvite.status, 400);
        assert.equal(missingTenantInvite.body.error?.code, "TENANT_ID_REQUIRED");

        // Valid SuperAdmin -> TenantAdmin A invitation
        const resInviteA = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: superAdminToken,
          body: {
            email: "tenantadminA@alpha.io",
            name: "Alice TenantAdmin",
            role: "TenantAdmin",
            tenantId: tenantAId,
          },
        });
        assert.equal(resInviteA.status, 201);
        assert.equal(resInviteA.body.data.user.role, "TenantAdmin");
        assert.equal(resInviteA.body.data.user.status, "Active");
        tenantAdminAInviteToken = resInviteA.body.data.invitationToken;
        tenantAdminAId = resInviteA.body.data.user.id;

        const membershipBefore = await TenantMembership.findOne({ userId: tenantAdminAId });
        assert.equal(membershipBefore?.status, "Invited");

        // Valid SuperAdmin -> TenantAdmin B invitation
        const resInviteB = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: superAdminToken,
          body: {
            email: "tenantadminB@beta.io",
            name: "Bob TenantAdmin",
            role: "TenantAdmin",
            tenantId: tenantBId,
          },
        });
        assert.equal(resInviteB.status, 201);
        tenantAdminBInviteToken = resInviteB.body.data.invitationToken;
        tenantAdminBId = resInviteB.body.data.user.id;
      }
    );

    await runTest(
      "Onboarding & Invitations",
      "First TenantAdmin accepting invite automatically transitions Tenant from 'Pending' to 'Active'",
      async () => {
        const acceptA = await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: {
            token: tenantAdminAInviteToken,
            password: "TenantAdminA@123",
            name: "Alice TenantAdmin",
          },
        });
        assert.equal(acceptA.status, 200);
        assert.equal(acceptA.body.data.user.status, "Active");

        // Verify Tenant A is now Active
        const tenantA = await Tenant.findById(tenantAId);
        assert.equal(tenantA?.status, "Active", "Tenant A must transition from Pending to Active");

        const acceptB = await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: {
            token: tenantAdminBInviteToken,
            password: "TenantAdminB@123",
            name: "Bob TenantAdmin",
          },
        });
        assert.equal(acceptB.status, 200);
        const tenantB = await Tenant.findById(tenantBId);
        assert.equal(tenantB?.status, "Active", "Tenant B must transition from Pending to Active");
      }
    );

    let tenantAdminAToken = "";
    let tenantAdminBToken = "";

    await runTest(
      "Onboarding & Invitations",
      "TenantAdmin A & B tokens are scoped to their respective tenants and blocked from /api/v1/tenants",
      async () => {
        tenantAdminAToken = signTestJwt({
          userId: tenantAdminAId,
          email: "tenantadmina@alpha.io",
          role: "TenantAdmin",
          tenantId: tenantAId,
          tenantIds: [tenantAId],
        });
        tenantAdminBToken = signTestJwt({
          userId: tenantAdminBId,
          email: "tenantadminb@beta.io",
          role: "TenantAdmin",
          tenantId: tenantBId,
          tenantIds: [tenantBId],
        });

        // TenantAdmin cannot list or create Tenants
        const resList = await apiRequest(baseUrl, "GET", "/tenants", {
          token: tenantAdminAToken,
        });
        assert.equal(resList.status, 403);
      }
    );

    let auditor1Id = "";
    let auditor2Id = "";
    let auditor1InviteTokenA = "";
    let auditor2InviteTokenA = "";

    await runTest(
      "Onboarding & Invitations",
      "TenantAdmin can ONLY invite Auditors to their own tenant (rejects TenantAdmin/SuperAdmin invite)",
      async () => {
        // TenantAdmin attempting to invite another TenantAdmin -> 403
        const badRoleInvite = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: tenantAdminAToken,
          body: {
            email: "otheradmin@alpha.io",
            name: "Other Admin",
            role: "TenantAdmin",
          },
        });
        assert.equal(badRoleInvite.status, 403);
        assert.equal(badRoleInvite.body.error?.code, "PRIVILEGE_ESCALATION_DENIED");

        // TenantAdmin A invites Auditor 1
        const inv1 = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: tenantAdminAToken,
          body: {
            email: "auditor1@alpha.io",
            name: "Auditor One",
            role: "Auditor",
          },
        });
        assert.equal(inv1.status, 201);
        assert.equal(inv1.body.data.user.role, "Auditor");
        assert.equal(inv1.body.data.user.tenantId.toString(), tenantAId.toString());
        auditor1Id = inv1.body.data.user.id;
        auditor1InviteTokenA = inv1.body.data.invitationToken;

        // TenantAdmin A invites Auditor 2
        const inv2 = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: tenantAdminAToken,
          body: {
            email: "auditor2@alpha.io",
            name: "Auditor Two",
            role: "Auditor",
          },
        });
        assert.equal(inv2.status, 201);
        auditor2Id = inv2.body.data.user.id;
        auditor2InviteTokenA = inv2.body.data.invitationToken;

        // Accept both invitations
        const acc1 = await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: { token: auditor1InviteTokenA, password: "Auditor1@123" },
        });
        assert.equal(acc1.status, 200);

        const acc2 = await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: { token: auditor2InviteTokenA, password: "Auditor2@123" },
        });
        assert.equal(acc2.status, 200);
      }
    );

    await runTest(
      "Onboarding & Invitations",
      "Multi-Tenant Auditor: TenantAdmin B can invite existing Auditor 1 to Tenant B via TenantMembership",
      async () => {
        const invMulti = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: tenantAdminBToken,
          body: {
            email: "auditor1@alpha.io",
            name: "Auditor One",
            role: "Auditor",
          },
        });
        assert.equal(invMulti.status, 201);
        const multiToken = invMulti.body.data.invitationToken;

        // Auditor 1 accepts Tenant B invitation
        const accMulti = await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: { token: multiToken },
        });
        assert.equal(accMulti.status, 200);

        // Verify Auditor 1 has active memberships in both Tenant A and Tenant B
        const memberships = await TenantMembership.find({
          userId: auditor1Id,
          status: "Active",
        });
        assert.equal(memberships.length, 2, "Auditor 1 must have 2 active tenant memberships");
      }
    );

    // ==========================================================================
    // CATEGORY 3: MULTI-TENANT CONTEXT SWITCHING & TENANT SUSPENSION
    // ==========================================================================
    console.log("\n▶ Category 3: Multi-Tenant Context Switching & Tenant Suspension");

    let auditor1Token = "";
    let auditor2Token = "";

    await runTest(
      "Multi-Tenant & Suspension",
      "Auditor 1 login returns JWT with both tenantIds; Auditor cannot invite users",
      async () => {
        const login1 = await apiRequest(baseUrl, "POST", "/auth/login", {
          body: { email: "auditor1@alpha.io", password: "Auditor1@123" },
        });
        assert.equal(login1.status, 200);
        auditor1Token = login1.body.data.token;
        assert.equal(login1.body.data.user.role, "Auditor");
        assert.equal(login1.body.data.user.tenantIds.length, 2);

        const login2 = await apiRequest(baseUrl, "POST", "/auth/login", {
          body: { email: "auditor2@alpha.io", password: "Auditor2@123" },
        });
        assert.equal(login2.status, 200);
        auditor2Token = login2.body.data.token;
        assert.equal(login2.body.data.user.tenantIds.length, 1);

        // Auditor attempting to invite a user -> 403
        const audInvite = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: auditor1Token,
          body: { email: "someone@alpha.io", name: "Someone", role: "Auditor" },
        });
        assert.equal(audInvite.status, 403);
      }
    );

    await runTest(
      "Multi-Tenant & Suspension",
      "x-tenant-id header switches active tenant for authorized multi-tenant Auditor and rejects unauthorized tenant with 403 CROSS_TENANT_ACCESS_DENIED",
      async () => {
        // Auditor 2 belongs ONLY to Tenant A; requesting Tenant B via x-tenant-id must fail with 403
        const unauthorizedSwitch = await apiRequest(baseUrl, "GET", "/companies", {
          token: auditor2Token,
          tenantIdHeader: tenantBId,
        });
        assert.equal(unauthorizedSwitch.status, 403);
        assert.equal(unauthorizedSwitch.body.error?.code, "CROSS_TENANT_ACCESS_DENIED");

        // Auditor 1 belongs to BOTH Tenant A and Tenant B; requesting Tenant B succeeds
        const authorizedSwitch = await apiRequest(baseUrl, "GET", "/companies", {
          token: auditor1Token,
          tenantIdHeader: tenantBId,
        });
        assert.equal(authorizedSwitch.status, 200);
      }
    );

    await runTest(
      "Multi-Tenant & Suspension",
      "Suspending a Tenant immediately blocks all logins & API requests for that tenant (403 TENANT_INACTIVE) while keeping other tenants accessible",
      async () => {
        // SuperAdmin suspends Tenant B
        const suspendRes = await apiRequest(baseUrl, "PATCH", `/tenants/${tenantBId}/status`, {
          token: superAdminToken,
          body: { status: "Suspended" },
        });
        assert.equal(suspendRes.status, 200);
        assert.equal(suspendRes.body.data.tenant.status, "Suspended");

        // TenantAdmin B API request -> 403 TENANT_INACTIVE
        const blockedApi = await apiRequest(baseUrl, "GET", "/companies", {
          token: tenantAdminBToken,
        });
        assert.equal(blockedApi.status, 403);
        assert.equal(blockedApi.body.error?.code, "TENANT_INACTIVE");

        // Multi-tenant Auditor 1 accessing Tenant B -> 403 TENANT_INACTIVE
        const blockedAuditorB = await apiRequest(baseUrl, "GET", "/companies", {
          token: auditor1Token,
          tenantIdHeader: tenantBId,
        });
        assert.equal(blockedAuditorB.status, 403);
        assert.equal(blockedAuditorB.body.error?.code, "TENANT_INACTIVE");

        // Multi-tenant Auditor 1 accessing Tenant A -> 200 OK!
        const allowedAuditorA = await apiRequest(baseUrl, "GET", "/companies", {
          token: auditor1Token,
          tenantIdHeader: tenantAId,
        });
        assert.equal(allowedAuditorA.status, 200);

        // SuperAdmin reactivates Tenant B
        const reactivateRes = await apiRequest(baseUrl, "PATCH", `/tenants/${tenantBId}/status`, {
          token: superAdminToken,
          body: { status: "Active" },
        });
        assert.equal(reactivateRes.status, 200);

        // TenantAdmin B can now access API again
        const restoredApi = await apiRequest(baseUrl, "GET", "/companies", {
          token: tenantAdminBToken,
        });
        assert.equal(restoredApi.status, 200);
      }
    );

    // ==========================================================================
    // CATEGORY 4: CLIENT ORGANIZATION (COMPANY) MANAGEMENT & TENANT ISOLATION
    // ==========================================================================
    console.log("\n▶ Category 4: Client Organization (Company) Management & Tenant Isolation");

    let clientOrgAId = "";
    let clientOrgBId = "";

    await runTest(
      "Client Organizations",
      "TenantAdmin creates Client Organizations scoped to their tenant; same domain is allowed across different tenants",
      async () => {
        // TenantAdmin A creates Acme AI in Tenant A
        const resOrgA = await apiRequest(baseUrl, "POST", "/companies", {
          token: tenantAdminAToken,
          body: {
            name: "Acme AI Corp",
            domain: "acme.ai",
            industry: "Technology",
            country: "US",
          },
        });
        assert.equal(resOrgA.status, 201);
        assert.equal(resOrgA.body.data.company.tenantId.toString(), tenantAId.toString());
        assert.equal(resOrgA.body.data.clientUser, undefined, "Client Organization must NOT create a login user");
        clientOrgAId = resOrgA.body.data.company._id || resOrgA.body.data.company.id;

        // Duplicate domain inside the SAME tenant (Tenant A) -> 409
        const dupSameTenant = await apiRequest(baseUrl, "POST", "/companies", {
          token: tenantAdminAToken,
          body: {
            name: "Acme AI Duplicate",
            domain: "acme.ai",
          },
        });
        assert.equal(dupSameTenant.status, 409);
        assert.equal(dupSameTenant.body.error?.code, "DOMAIN_EXISTS");

        // Same domain inside a DIFFERENT tenant (Tenant B) -> 201 Created!
        const resOrgB = await apiRequest(baseUrl, "POST", "/companies", {
          token: tenantAdminBToken,
          body: {
            name: "Acme AI Corp (Beta Client)",
            domain: "acme.ai",
            industry: "Technology",
            country: "US",
          },
        });
        assert.equal(resOrgB.status, 201);
        assert.equal(resOrgB.body.data.company.tenantId.toString(), tenantBId.toString());
        clientOrgBId = resOrgB.body.data.company._id || resOrgB.body.data.company.id;
      }
    );

    await runTest(
      "Client Organizations",
      "Auditor cannot create or edit Client Organizations (403); SuperAdmin is blocked from viewing/creating Client Organizations (403)",
      async () => {
        // Auditor attempting POST /companies -> 403
        const audCreate = await apiRequest(baseUrl, "POST", "/companies", {
          token: auditor1Token,
          body: { name: "Auditor Org", domain: "auditororg.ai" },
        });
        assert.equal(audCreate.status, 403);

        // Auditor attempting PATCH /companies/:id -> 403
        const audPatch = await apiRequest(baseUrl, "PATCH", `/companies/${clientOrgAId}`, {
          token: auditor1Token,
          body: { name: "Tampered Name" },
        });
        assert.equal(audPatch.status, 403);

        // SuperAdmin attempting GET /companies -> 403 FORBIDDEN (blocked by authorize("TenantAdmin", "Auditor"))
        const saList = await apiRequest(baseUrl, "GET", "/companies", {
          token: superAdminToken,
        });
        assert.equal(saList.status, 403);

        // SuperAdmin attempting GET /companies/:id -> 403
        const saGet = await apiRequest(baseUrl, "GET", `/companies/${clientOrgAId}`, {
          token: superAdminToken,
        });
        assert.equal(saGet.status, 403);
      }
    );

    await runTest(
      "Client Organizations",
      "Cross-tenant isolation on Client Organizations: TenantAdmin B cannot view or update Tenant A's Client Organization",
      async () => {
        const crossGet = await apiRequest(baseUrl, "GET", `/companies/${clientOrgAId}`, {
          token: tenantAdminBToken,
        });
        assert.equal(crossGet.status, 403);
        assert.equal(crossGet.body.error?.code, "CROSS_TENANT_ACCESS_DENIED");

        const crossPatch = await apiRequest(baseUrl, "PATCH", `/companies/${clientOrgAId}`, {
          token: tenantAdminBToken,
          body: { name: "Cross Tenant Edit" },
        });
        assert.equal(crossPatch.status, 403);
        assert.equal(crossPatch.body.error?.code, "CROSS_TENANT_ACCESS_DENIED");

        // Auditor in Tenant A can view Tenant A's Client Organization
        const audGet = await apiRequest(baseUrl, "GET", `/companies/${clientOrgAId}`, {
          token: auditor2Token,
        });
        assert.equal(audGet.status, 200);
        assert.equal(audGet.body.data.name, "Acme AI Corp");
      }
    );

    // ==========================================================================
    // CATEGORY 5: ASSESSMENT VISIBILITY, SHARING, CO-SIGNING & SUBMISSION
    // ==========================================================================
    console.log("\n▶ Category 5: Assessment Visibility, Sharing, Co-Signing & Submission");

    await runTest(
      "Assessments & Collaboration",
      "SuperAdmin is strictly blocked from all assessment endpoints (POST /assessments, GET /assessments, GET /dashboard/admin/assessments)",
      async () => {
        const saCreate = await apiRequest(baseUrl, "POST", "/assessments", {
          token: superAdminToken,
          body: { companyId: clientOrgAId, assessmentType: "Light" },
        });
        assert.equal(saCreate.status, 403);

        const saList = await apiRequest(baseUrl, "GET", "/assessments", {
          token: superAdminToken,
        });
        assert.equal(saList.status, 403);

        const saDash = await apiRequest(baseUrl, "GET", "/dashboard/admin/assessments", {
          token: superAdminToken,
        });
        assert.equal(saDash.status, 403);
        assert.equal(saDash.body.error?.code, "SUPER_ADMIN_CONTENT_ACCESS_RESTRICTED");
      }
    );

    let session1Id = "";
    let session2Id = "";

    await runTest(
      "Assessments & Collaboration",
      "Auditor 1 creates Assessment S1 in Tenant A; unshared Auditor 2 in the SAME tenant CANNOT see, view, edit, co-sign, or submit S1",
      async () => {
        // Auditor 1 creates S1
        const createS1 = await apiRequest(baseUrl, "POST", "/assessments", {
          token: auditor1Token,
          tenantIdHeader: tenantAId,
          body: {
            companyId: clientOrgAId,
            assessmentType: "Light",
          },
        });
        assert.equal(createS1.status, 201);
        session1Id = createS1.body.data.session._id;

        // Auditor 2 lists assessments in Tenant A -> must NOT see S1!
        const listAud2 = await apiRequest(baseUrl, "GET", "/assessments", {
          token: auditor2Token,
        });
        assert.equal(listAud2.status, 200);
        assert.equal(
          listAud2.body.data.length,
          0,
          "Unshared Auditor 2 must see 0 assessments"
        );

        // Auditor 2 attempting GET /assessments/:s1Id -> 403 ASSESSMENT_ACCESS_DENIED
        const getAud2 = await apiRequest(baseUrl, "GET", `/assessments/${session1Id}`, {
          token: auditor2Token,
        });
        assert.equal(getAud2.status, 403);
        assert.equal(getAud2.body.error?.code, "ASSESSMENT_ACCESS_DENIED");

        // Auditor 2 attempting PUT /assessments/:s1Id/answers -> 403
        const editAud2 = await apiRequest(
          baseUrl,
          "PUT",
          `/assessments/${session1Id}/answers`,
          {
            token: auditor2Token,
            body: {
              answers: [
                {
                  questionId: "Q-P1-01",
                  selectedOptionCode: "YES",
                  scoreValue: 4,
                },
              ],
            },
          }
        );
        assert.equal(editAud2.status, 403);
        assert.equal(editAud2.body.error?.code, "ASSESSMENT_ACCESS_DENIED");

        // Auditor 2 attempting POST /assessments/:s1Id/co-sign -> 403
        const cosignAud2 = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/co-sign`,
          {
            token: auditor2Token,
            body: { attestationNotes: "Unauthorized co-sign" },
          }
        );
        assert.equal(cosignAud2.status, 403);

        // Auditor 2 attempting POST /assessments/:s1Id/submit -> 403
        const submitAud2 = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/submit`,
          {
            token: auditor2Token,
          }
        );
        assert.equal(submitAud2.status, 403);
      }
    );

    await runTest(
      "Assessments & Collaboration",
      "TenantAdmin A can view S1 and create Assessment S2 in Tenant A, but CANNOT edit answers, upload evidence, co-sign, or submit",
      async () => {
        // TenantAdmin A views S1 -> 200
        const taGet = await apiRequest(baseUrl, "GET", `/assessments/${session1Id}`, {
          token: tenantAdminAToken,
        });
        assert.equal(taGet.status, 200);

        // TenantAdmin A creates S2 and assigns Auditor 2 as conductedByUserId -> 201
        const taCreate = await apiRequest(baseUrl, "POST", "/assessments", {
          token: tenantAdminAToken,
          body: {
            companyId: clientOrgAId,
            assessmentType: "Light",
            conductedByUserId: auditor2Id,
          },
        });
        assert.equal(taCreate.status, 201);
        session2Id = taCreate.body.data.session._id;

        // TenantAdmin A attempting to save answers -> 403
        const taSaveAnswers = await apiRequest(
          baseUrl,
          "PUT",
          `/assessments/${session1Id}/answers`,
          {
            token: tenantAdminAToken,
            body: {
              answers: [{ questionId: "Q-P1-01", selectedOptionCode: "YES" }],
            },
          }
        );
        assert.equal(taSaveAnswers.status, 403);

        // TenantAdmin A attempting to co-sign -> 403
        const taCoSign = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/co-sign`,
          {
            token: tenantAdminAToken,
            body: { attestationNotes: "Admin trying to sign" },
          }
        );
        assert.equal(taCoSign.status, 403);

        // TenantAdmin A attempting to submit -> 403
        const taSubmit = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/submit`,
          {
            token: tenantAdminAToken,
          }
        );
        assert.equal(taSubmit.status, 403);

        // Cross-tenant check: TenantAdmin B cannot view Tenant A's assessment S1 -> 403
        const tbGet = await apiRequest(baseUrl, "GET", `/assessments/${session1Id}`, {
          token: tenantAdminBToken,
        });
        assert.equal(tbGet.status, 403);
        assert.equal(tbGet.body.error?.code, "CROSS_TENANT_ACCESS_DENIED");
      }
    );

    await runTest(
      "Assessments & Collaboration",
      "Auditor 1 shares Assessment S1 with Auditor 2 (POST /:id/share); cross-tenant sharing is blocked (403 CROSS_TENANT_SHARING_PROHIBITED)",
      async () => {
        // Create an Auditor 3 exclusively in Tenant B
        const inv3 = await apiRequest(baseUrl, "POST", "/users/invite", {
          token: tenantAdminBToken,
          body: {
            email: "auditor3@beta.io",
            name: "Auditor Three (Beta Only)",
            role: "Auditor",
          },
        });
        const auditor3Id = inv3.body.data.user.id;
        await apiRequest(baseUrl, "POST", "/users/accept-invite", {
          body: { token: inv3.body.data.invitationToken, password: "Auditor3@123" },
        });

        // Attempt to share Tenant A's S1 with Tenant B's Auditor 3 -> 403 CROSS_TENANT_SHARING_PROHIBITED
        const crossShare = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/share`,
          {
            token: auditor1Token,
            tenantIdHeader: tenantAId,
            body: { auditorIds: [auditor3Id] },
          }
        );
        assert.equal(crossShare.status, 403);
        assert.equal(crossShare.body.error?.code, "CROSS_TENANT_SHARING_PROHIBITED");

        // Valid intra-tenant share: Auditor 1 shares S1 with Auditor 2 -> 200
        const validShare = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/share`,
          {
            token: auditor1Token,
            tenantIdHeader: tenantAId,
            body: { auditorIds: [auditor2Id] },
          }
        );
        assert.equal(validShare.status, 200);
        assert.equal(validShare.body.data.session.sharedWith.length, 1);

        // Now Auditor 2 can view S1!
        const aud2View = await apiRequest(baseUrl, "GET", `/assessments/${session1Id}`, {
          token: auditor2Token,
        });
        assert.equal(aud2View.status, 200);
      }
    );

    await runTest(
      "Assessments & Collaboration",
      "Shared Auditor 2 can edit answers and co-sign S1 (POST /:id/co-sign); Auditor 1 submits S1 recording both co-signatures",
      async () => {
        // Shared Auditor 2 edits answers on S1
        const saveRes = await apiRequest(
          baseUrl,
          "PUT",
          `/assessments/${session1Id}/answers`,
          {
            token: auditor2Token,
            body: {
              answers: [
                {
                  questionId: "Q-P1-01",
                  selectedOptionCode: "YES",
                  scoreValue: 4,
                  testStatus: "Complete",
                  exceptionStatus: "NoExceptionNoted",
                  evidenceNotes: "Verified AI Ethics Charter v2.1",
                },
              ],
            },
          }
        );
        assert.equal(saveRes.status, 200);
        assert.equal(saveRes.body.data.savedCount, 1);

        // Shared Auditor 2 co-signs S1
        const coSignRes = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/co-sign`,
          {
            token: auditor2Token,
            body: { attestationNotes: "Peer review complete. No exceptions noted." },
          }
        );
        assert.equal(coSignRes.status, 200);
        assert.equal(coSignRes.body.data.coSignatures.length, 1);
        assert.equal(coSignRes.body.data.coSignatures[0].auditorEmail, "auditor2@alpha.io");

        // Lead Auditor 1 submits S1 -> status becomes Submitted and Auditor 1's signature is added
        const submitRes = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session1Id}/submit`,
          {
            token: auditor1Token,
            tenantIdHeader: tenantAId,
          }
        );
        assert.equal(submitRes.status, 200);
        assert.equal(submitRes.body.data.session.status, "Submitted");
        assert.equal(
          submitRes.body.data.session.coSignatures.length,
          2,
          "Both Auditor 2 (peer reviewer) and Auditor 1 (submitter) must be recorded in coSignatures"
        );
      }
    );

    await runTest(
      "Assessments & Collaboration",
      "Revoking share access (DELETE /:id/share/:auditorId) immediately removes Auditor's visibility and edit access",
      async () => {
        // TenantAdmin A shares S2 with Auditor 1
        const shareS2 = await apiRequest(
          baseUrl,
          "POST",
          `/assessments/${session2Id}/share`,
          {
            token: tenantAdminAToken,
            body: { auditorIds: [auditor1Id] },
          }
        );
        assert.equal(shareS2.status, 200);

        // Confirm Auditor 1 can access S2 while shared
        const accessBefore = await apiRequest(baseUrl, "GET", `/assessments/${session2Id}`, {
          token: auditor1Token,
          tenantIdHeader: tenantAId,
        });
        assert.equal(accessBefore.status, 200);

        // TenantAdmin A revokes Auditor 1's share on S2
        const revokeRes = await apiRequest(
          baseUrl,
          "DELETE",
          `/assessments/${session2Id}/share/${auditor1Id}`,
          {
            token: tenantAdminAToken,
          }
        );
        assert.equal(revokeRes.status, 200);

        // Confirm Auditor 1 is now blocked from S2 (403 ASSESSMENT_ACCESS_DENIED)
        const accessAfter = await apiRequest(baseUrl, "GET", `/assessments/${session2Id}`, {
          token: auditor1Token,
          tenantIdHeader: tenantAId,
        });
        assert.equal(accessAfter.status, 403);
        assert.equal(accessAfter.body.error?.code, "ASSESSMENT_ACCESS_DENIED");
      }
    );

    // ==========================================================================
    // CATEGORY 6: DASHBOARDS & AUDIT LOG SCOPING
    // ==========================================================================
    console.log("\n▶ Category 6: Dashboards & Audit Log Tenant/Role Scoping");

    await runTest(
      "Dashboards & Audit Logs",
      "SuperAdmin dashboard returns tenant metadata only (totalTenants: 2, totalAssessments: 0)",
      async () => {
        const res = await apiRequest(baseUrl, "GET", "/dashboard/admin/summary", {
          token: superAdminToken,
        });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.tenantsByStatus.total, 2);
        assert.equal(res.body.data.tenantsByStatus.active, 2);
        assert.equal(res.body.data.stats.totalAssessments, 0);
      }
    );

    await runTest(
      "Dashboards & Audit Logs",
      "TenantAdmin dashboard is strictly scoped to their own tenant's organizations and assessments",
      async () => {
        const resA = await apiRequest(baseUrl, "GET", "/dashboard/admin/summary", {
          token: tenantAdminAToken,
        });
        assert.equal(resA.status, 200);
        assert.equal(resA.body.data.stats.totalOrganizations, 1);
        assert.equal(resA.body.data.stats.totalAssessments, 2);

        const resB = await apiRequest(baseUrl, "GET", "/dashboard/admin/summary", {
          token: tenantAdminBToken,
        });
        assert.equal(resB.status, 200);
        assert.equal(resB.body.data.stats.totalOrganizations, 1);
        assert.equal(resB.body.data.stats.totalAssessments, 0);
      }
    );

    await runTest(
      "Dashboards & Audit Logs",
      "Auditor dashboard and organization stats count ONLY assessments created by or shared with that Auditor",
      async () => {
        // Auditor 1 is creator of S1, and was revoked from S2 -> should see 1 assessment
        const sumAud1 = await apiRequest(baseUrl, "GET", "/dashboard/auditor/summary", {
          token: auditor1Token,
          tenantIdHeader: tenantAId,
        });
        assert.equal(sumAud1.status, 200);
        assert.equal(sumAud1.body.data.stats.totalAssessments, 1);

        // Auditor 2 is shared on S1 and conductedBy on S2 -> should see 2 assessments
        const sumAud2 = await apiRequest(baseUrl, "GET", "/dashboard/auditor/summary", {
          token: auditor2Token,
        });
        assert.equal(sumAud2.status, 200);
        assert.equal(sumAud2.body.data.stats.totalAssessments, 2);
      }
    );

    await runTest(
      "Dashboards & Audit Logs",
      "Audit logs endpoint (/api/v1/admin/audit-logs) scopes TenantAdmin strictly to their own tenant",
      async () => {
        const logsA = await apiRequest(baseUrl, "GET", "/admin/audit-logs", {
          token: tenantAdminAToken,
        });
        assert.equal(logsA.status, 200);
        const tenantALogs = logsA.body.data as any[];
        assert.ok(tenantALogs.length > 0, "Expected Tenant A to have audit logs");
        for (const log of tenantALogs) {
          assert.equal(
            log.tenantId?.toString(),
            tenantAId.toString(),
            "TenantAdmin A must never see another tenant's audit logs"
          );
        }
      }
    );
  } finally {
    // In-process Express dispatcher cleanup complete
  }

  // ============================================================================
  // Summary Report
  // ============================================================================
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log("\n================================================================================");
  console.log(
    `  TEST SUITE SUMMARY: ${passedCount}/${results.length} PASSED | ${failedCount} FAILED`
  );
  console.log("================================================================================");

  if (failedCount > 0) {
    console.error("\nFailed Tests:");
    for (const f of results.filter((r) => !r.passed)) {
      console.error(`  - [#${f.id}] (${f.category}) ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error running RBAC test suite:", err);
  process.exit(1);
});