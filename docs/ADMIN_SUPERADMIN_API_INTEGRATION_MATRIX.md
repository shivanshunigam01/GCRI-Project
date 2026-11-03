# GRAICE — Admin & SuperAdmin API Integration Matrix

**Scope:** Frontend-only Admin / SuperAdmin workflow integration  
**Source of truth:** Registered Express routes + Zod schemas + controller `authorize()`  
**Roles in scope:** `SuperAdmin`, `Admin`, `Assessor` (MembershipApprover not active)  
**Date:** 2026-11-03  
**Batch status:** Batch 1 (Dashboard + Organizations) implemented; Batches 2–6 pending

---

## Status legend

| Status | Meaning |
|--------|---------|
| INTEGRATED | Service + page/component call correct endpoint with role UX |
| PARTIAL | Service exists and/or UI partial; gaps remain |
| NOT INTEGRATED | Registered API with no correct Admin/SuperAdmin UI wiring |
| INFRASTRUCTURE ONLY | Health/docs/system — not business UI |
| NOT APPLICABLE | Assessor-only or out of Admin/SuperAdmin product scope |
| BLOCKED BY BACKEND | Frontend cannot complete without backend contract change |

---

## Mount map (`/api/v1`)

| Mount | Route file |
|-------|------------|
| `/` | `health.routes.ts` |
| `/auth` | `auth.routes.ts` |
| `/companies` | `company.routes.ts` |
| `/users` | `user.routes.ts` |
| `/assessments` | `assessment.routes.ts` |
| `/frameworks` | `framework.routes.ts` |
| `/admin/auditor-mappings` | `auditorMapping.routes.ts` |
| `/admin/frameworks` | `adminFramework.routes.ts` |
| `/admin/audit-logs` | `auditLog.routes.ts` |
| `/admin/api-keys` | `apiKey.routes.ts` |
| `/webhooks` | `webhook.routes.ts` |
| `/dashboard` | `dashboard.routes.ts` |

---

## 1. Infrastructure

| Method | Path | Roles | Service | Page / Trigger | Status | Milestone | Notes |
|--------|------|-------|---------|----------------|--------|-----------|-------|
| GET | `/health` | Public | — | — | INFRASTRUCTURE ONLY | — | Do not surface in Admin UI |
| GET | `/docs` (Swagger) | Public | — | — | INFRASTRUCTURE ONLY | — | Docs only |

---

## 2. Auth & session (shared; Settings Batch 6)

| Method | Path | Roles | Request | Service | Page | Status | Milestone | Correction |
|--------|------|-------|---------|---------|------|--------|-----------|------------|
| POST | `/auth/register` | Public | RegisterSchema | `userService.registerDirectUser` | (legacy) | PARTIAL | M1 / B6 | Policy: public register may remain; do not promote MembershipApprover |
| POST | `/auth/login` | Public | LoginSchema | `authService.login` | `/login` | INTEGRATED | M1 | — |
| POST | `/auth/oauth/google` | Public | idToken | `authService.oauthGoogle` | `/login` | PARTIAL | M1 / B6 | OAuth MFA bypass is backend; FE must not reintroduce dummy tokens as “working SSO” |
| POST | `/auth/oauth/microsoft` | Public | idToken | `authService.oauthMicrosoft` | `/login` | PARTIAL | M1 / B6 | Same as Google |
| POST | `/auth/mfa/generate` | Authenticated | — | `authService.setupMfa` | `/settings/security`, MFA enroll | INTEGRATED | M1 / B6 | Verify SuperAdmin mandatory MFA UX |
| POST | `/auth/mfa/verify` | Authenticated | MfaVerifySchema | `authService.verifyMfa` | MFA flows | INTEGRATED | M1 / B6 | — |
| POST | `/auth/mfa/disable` | Authenticated | MfaDisableSchema | `authService.disableMfa` | `/settings/security` | PARTIAL | B6 | Must block disable for SuperAdmin + Admin |
| POST | `/auth/forgot-password` | Public | ForgotPasswordSchema | `authService.forgotPassword` | `/forgot-password` | INTEGRATED | M1 | — |
| POST | `/auth/reset-password` | Public | ResetPasswordSchema | `authService.resetPassword` | `/reset-password` | INTEGRATED | M1 | — |
| POST | `/auth/change-password` | Authenticated | ChangePasswordSchema | `authService.changePassword` | `/settings/security` | INTEGRATED | M1 / B6 | — |
| GET | `/users/me` | Authenticated | — | `userService.getCurrentUser` | AuthContext, profile | INTEGRATED | M1 / B6 | — |
| PATCH | `/users/me` | Authenticated | UpdateProfileSchema | `userService.updateProfile` | `/settings/profile` | INTEGRATED | M1 / B6 | — |

---

## 3. Dashboard — Batch 1

| Method | Path | Roles | Request | Service | Page | Status | Milestone | Correction |
|--------|------|-------|---------|---------|------|--------|-----------|------------|
| GET | `/dashboard/admin/summary` | SuperAdmin, Admin | — | `dashboardService.getAdminSummary` | `/dashboard` (Admin view) | INTEGRATED | B1 | SuperAdmin uses `isAdmin` → Admin view (not Assessor). Hardcoded KPI fallbacks removed. |
| GET | `/dashboard/admin/assessments` | SuperAdmin, Admin | status, search, assessmentType, page, limit (max 100) | `dashboardService.getAdminAssessments` | `/dashboard` recent table | INTEGRATED | B1 | Partial-failure warning via `Promise.allSettled`. No companyId query on this endpoint (client scope filter only). |
| GET | `/dashboard/auditor/summary` | Assessor | — | `dashboardService.getAuditorSummary` | `/dashboard` Assessor | NOT APPLICABLE | M2 | Assessor only |
| GET | `/dashboard/auditor/assessments` | Assessor | org/status/type/page/limit | `dashboardService.getAuditorAssessments` | Assessor dashboard | NOT APPLICABLE | M2 | — |
| GET | `/dashboard/auditor/organizations` | Assessor | — | `dashboardService.getAuditorOrganizations` | Assessor dashboard | NOT APPLICABLE | M2 | — |

**Tenant scope:** Admin summary/assessments filtered by `req.user.companyId` on backend. SuperAdmin global.

---

## 4. Organizations — Batch 1

| Method | Path | Roles | Request | Service | Page | Status | Milestone | Correction |
|--------|------|-------|---------|---------|------|--------|-----------|------------|
| GET | `/companies` | Authenticated (scoped) | page, limit, search, status, verificationStatus | `companyService.getCompanies` | `/organizations` | INTEGRATED | B1 | Removed invalid `tier` query; verificationStatus server-side; tier client-side |
| GET | `/companies/:id` | Authenticated + company scope | — | `companyService.getCompanyById` | `/organizations/[id]`, drawer | INTEGRATED | B1 | — |
| POST | `/companies` | SuperAdmin, Admin, Assessor | CreateCompanySchema: name, domain, registrationNumber?, country?, industry?, user? | `companyService.createCompany` | Onboard modal (SuperAdmin UI) | INTEGRATED | B1 | Stopped sending `activePlan` (not in schema / ignored by controller). Onboard button SuperAdmin-only (Admin creating foreign tenants cannot manage them under scope). |
| PATCH | `/companies/:id` | Authenticated + scope | UpdateCompanySchema: name?, registrationNumber?, country?, industry? | `companyService.updateCompany` | Drawer + `/organizations/[id]` edit | INTEGRATED | B1 | Removed fake domain/size/plan mutations from edit UX |
| POST | `/companies/:id/verify` | **SuperAdmin** | verificationStatus, notes? | `companyService.verifyCompanyDns` | Org list actions | INTEGRATED | B1 | SuperAdmin-only buttons; fixed post-verify state field (`verificationStatus`) |
| PATCH | `/companies/:id/status` | **SuperAdmin** | status, reason? | `companyService.updateCompanyStatus` | Org list / detail | INTEGRATED | B1 | SuperAdmin-only; reason optional (UI may omit) |
| GET | `/companies/:id/trends` | Authenticated + scope | — | `companyService.getCompanyTrends` | `/organizations/[id]` | INTEGRATED | B1 | Trends may expose maturity scores — Admin visibility follows backend; confirm product policy in Batch 4 |

---

## 5. Users & assessors — Batch 2

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/users` | SuperAdmin, Admin | `userService.getUsers` | `/admin/users` | PARTIAL | B2 | Audit filters, company scoping, role action gates |
| GET | `/users/:id` | SuperAdmin, Admin | `userService.getUserById` | `/admin/users` | PARTIAL | B2 | — |
| POST | `/users/invite` | SuperAdmin, Admin | `userService.inviteUser` | `/admin/users` | PARTIAL | B2 | Admin must not invite SuperAdmin |
| POST | `/users/accept-invite` | Public | `userService.acceptInvite` | `/accept-invite` | INTEGRATED | M1 | — |
| PATCH | `/users/:id` | SuperAdmin, Admin | `userService.adminUpdateUser` | `/admin/users` | PARTIAL | B2 | — |
| PATCH | `/users/:id/status` | SuperAdmin, Admin | `userService.updateUserStatus` | `/admin/users` | PARTIAL | B2 | — |
| PATCH | `/users/:id/role` | SuperAdmin (verify controller) | `userService.updateUserRole` | `/admin/users` | PARTIAL | B2 | SuperAdmin-only role change |
| POST | `/users/:id/reset-password` | SuperAdmin, Admin | `userService.adminResetPassword` | `/admin/users` | PARTIAL | B2 | Never log tokens |

---

## 6. Auditor mappings — Batch 2

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/admin/auditor-mappings` | SuperAdmin, Admin | `auditorMappingService.getAllMappings` | `/admin/auditor-mappings` | PARTIAL | B2 | Tenant scope for Admin |
| POST | `/admin/auditor-mappings` | SuperAdmin, Admin | `auditorMappingService.createMapping` | mappings + org people tab | PARTIAL | B2 | Duplicate assignment errors |
| DELETE | `/admin/auditor-mappings/:id` | SuperAdmin, Admin | `auditorMappingService.deleteMapping` | mappings + org people | PARTIAL | B2 | — |
| GET | `/admin/auditor-mappings/org/:organizationId` | SuperAdmin, Admin, Assessor | `auditorMappingService.getMappingsByOrg` | org detail/drawer | INTEGRATED | B1/B2 | Used from org UI |
| GET | `/admin/auditor-mappings/auditor/:auditorId` | SuperAdmin, Admin, Assessor | `auditorMappingService.getMappingsByAuditor` | Assessor org access helpers | PARTIAL | B2 | — |

---

## 7. Framework admin — Batch 3

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/frameworks` | Authenticated | `frameworkService.listFrameworks` | Assessor / read | PARTIAL | B3 | Admin read-only OK |
| GET | `/frameworks/active` | Authenticated | `frameworkService.getActiveFramework` | Assessment create | INTEGRATED | M3 | — |
| GET | `/admin/frameworks` | SuperAdmin (route middleware) | `adminFrameworkService.listAllFrameworks` | `/admin/frameworks` | PARTIAL | B3 | Admin must not mutate |
| GET | `/admin/frameworks/:id` | SuperAdmin | `adminFrameworkService.getFrameworkById` | framework detail | PARTIAL | B3 | — |
| POST | `/admin/frameworks` | SuperAdmin | `adminFrameworkService.createDraft` | frameworks | PARTIAL | B3 | Clone via cloneFromVersion |
| PUT | `/admin/frameworks/:id/publish` | SuperAdmin | `publishFramework` | frameworks | PARTIAL | B3 | — |
| PUT | `/admin/frameworks/:id/rollback` | SuperAdmin | `rollbackFramework` | frameworks | PARTIAL | B3 | FE `framework.service` had POST mismatch — verify admin service PUT |
| DELETE | `/admin/frameworks/:id` | SuperAdmin | `deleteDraftFramework` | frameworks | PARTIAL | B3 | Unused drafts only |
| POST | `/admin/frameworks/:id/questions` | SuperAdmin | `addQuestion` | frameworks | PARTIAL | B3 | — |
| PUT | `/admin/frameworks/:id/questions/reorder` | SuperAdmin | `reorderQuestions` | frameworks | PARTIAL | B3 | — |
| PUT | `/admin/frameworks/:id/questions/:questionId` | SuperAdmin | `updateQuestion` | frameworks | PARTIAL | B3 | — |
| PATCH | `/admin/frameworks/:id/questions/:questionId/status` | SuperAdmin | `toggleQuestionStatus` | frameworks | PARTIAL | B3 | — |
| DELETE | `/admin/frameworks/:id/questions/:questionId` | SuperAdmin | `deleteQuestion` | frameworks | PARTIAL | B3 | — |
| PUT | `/admin/frameworks/:id/pillars` | SuperAdmin | `updatePillars` | frameworks | PARTIAL | B3 | — |
| PUT | `/admin/frameworks/:id/thresholds` | SuperAdmin | `updateMaturityThresholds` | frameworks | PARTIAL | B3 | — |

---

## 8. Assessment monitoring — Batch 4

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/assessments` | Authenticated scoped | `assessmentService.getAssessments` | `/assessments` | PARTIAL | B4 | Admin metadata-only UX |
| GET | `/assessments/company/:companyId` | Authenticated scoped | `getCompanyAssessments` | org detail | PARTIAL | B4 | Ensure Admin does not deep-link to findings |
| GET | `/assessments/:id` | Authenticated | `getAssessmentById` | workspace | NOT APPLICABLE / PARTIAL | B4 | Admin should not open confidential answers |
| GET | `/assessments/:id/progress` | Authenticated | `getProgress` | monitoring | PARTIAL | B4 | Preferred for Admin |
| POST | `/assessments/:id/remind` | Authenticated | `sendReminder` | assessments | PARTIAL | B4 | — |
| POST | `/assessments/:id/notifications/completion` | Authenticated | `sendCompletion` | assessments | PARTIAL | B4 | — |
| POST/PUT/GET report/findings/gaps/summary/… | Assessor-focused | various | Assessor flows | NOT APPLICABLE | M3 | Do not wire confidential endpoints into Admin pages |

---

## 9. Audit logs — Batch 5

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/admin/audit-logs` | SuperAdmin, Admin (middleware) | `auditLogService.getAuditLogs` | `/admin/audit-logs` | PARTIAL | B5 | Filters + pagination QA |
| GET | `/admin/audit-logs/stats` | SuperAdmin, Admin | `auditLogService.getAuditLogStats` | `/admin/audit-logs` | PARTIAL | B5 | — |

---

## 10. API keys — Batch 5

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/admin/api-keys` | SuperAdmin, Admin | `apiKeyService.listApiKeys` | `/admin/api-keys` | PARTIAL | B5 | Tenant restrictions |
| POST | `/admin/api-keys` | SuperAdmin, Admin | `apiKeyService.createApiKey` | `/admin/api-keys` | PARTIAL | B5 | Show secret once; ReadOnly claim needs backend verification |
| DELETE | `/admin/api-keys/:id` | SuperAdmin, Admin | `apiKeyService.revokeApiKey` | `/admin/api-keys` | PARTIAL | B5 | Confirm revoke |

---

## 11. Webhooks — Batch 5

| Method | Path | Roles | Service | Page | Status | Milestone | Notes |
|--------|------|-------|---------|------|--------|-----------|-------|
| GET | `/webhooks` | Authenticated | `webhookService.listWebhooks` | `/settings/webhooks` | PARTIAL | B5 | Org scope |
| POST | `/webhooks` | Authenticated | `webhookService.registerWebhook` | webhooks | PARTIAL | B5 | Never display stored secret |
| DELETE | `/webhooks/:id` | Authenticated | `webhookService.deleteWebhook` | webhooks | PARTIAL | B5 | — |
| POST | `/webhooks/:id/test` | Authenticated | `webhookService.testWebhook` | webhooks | PARTIAL | B5 | Show test outcome |

---

## Batch 1 readiness snapshot

| Area | Verdict |
|------|---------|
| Admin/SuperAdmin dashboard routing | **PASS** (SuperAdmin → admin APIs via `isAdmin`) |
| Dashboard real KPIs | **PASS** (no invented 95/65/fake scoped users) |
| Org directory + filters | **PASS** (schema-aligned query params) |
| Onboard payload | **PASS** (schema-aligned; plan blocked by backend) |
| Verify / suspend RBAC buttons | **PASS** (SuperAdmin-only; matches routes) |
| Org profile edit | **PASS** (drawer + detail page; schema fields only) |
| Batches 2–6 | **NOT STARTED** |

---

## Changed frontend files (Batch 1)

- `frontend/src/app/(dashboard)/dashboard/page.tsx`
- `frontend/src/app/(dashboard)/organizations/page.tsx`
- `frontend/src/app/(dashboard)/organizations/[id]/page.tsx`
- `frontend/src/components/features/companies/OrganizationDetailDrawer.tsx`
- `frontend/src/types/company.types.ts`
