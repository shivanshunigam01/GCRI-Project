# GRAICE — Admin & SuperAdmin Frontend Implementation Report

**Date:** 2026-11-03  
**Scope:** Frontend only  
**Progress:** Batch 1 complete (inventory + Dashboard + Organizations). Batches 2–6 not started.

---

## Executive summary

Complete API inventory is in `docs/ADMIN_SUPERADMIN_API_INTEGRATION_MATRIX.md`.  
Batch 1 corrected Admin/SuperAdmin dashboard loading, removed invented KPI fallbacks, aligned organization list/create/edit/verify/status UX with registered backend schemas and SuperAdmin-only mutation routes, and removed placeholder contact data from org profile.

---

## Batch 1 — APIs integrated / hardened

| API | Frontend wiring | Result |
|-----|-----------------|--------|
| `GET /dashboard/admin/summary` | `/dashboard` Admin view | INTEGRATED |
| `GET /dashboard/admin/assessments` | Recent assessments table | INTEGRATED |
| `GET /companies` | `/organizations` | INTEGRATED |
| `GET /companies/:id` | Detail page + drawer | INTEGRATED |
| `POST /companies` | SuperAdmin onboard modal | INTEGRATED |
| `PATCH /companies/:id` | Detail edit + drawer edit | INTEGRATED |
| `POST /companies/:id/verify` | SuperAdmin actions | INTEGRATED |
| `PATCH /companies/:id/status` | SuperAdmin suspend/activate | INTEGRATED |
| `GET /companies/:id/trends` | Org detail trends panel | INTEGRATED |

---

## Pages / components updated (Batch 1)

| File | Change |
|------|--------|
| `dashboard/page.tsx` | Admin fetch uses `Promise.allSettled`; warnings for Admin; SuperAdmin explicitly stays on admin APIs via `isAdmin`; removed hardcoded KPI invents |
| `organizations/page.tsx` | Query params match backend; SuperAdmin-only onboard; schema-safe create payload; verify state field fix |
| `organizations/[id]/page.tsx` | Real API profile fields (no fake contacts); Admin/SuperAdmin profile edit via PATCH |
| `OrganizationDetailDrawer.tsx` | Edit limited to UpdateCompanySchema fields; domain/tier read-only |
| `company.types.ts` | Documented that `activePlan` must not be sent on create |

---

## Features implemented (Batch 1)

- Role-correct dashboard: SuperAdmin + Admin → admin summary/assessments; Assessor → auditor APIs
- Global vs tenant org directory (backend scoping)
- Loading / error / retry / partial warning states on dashboard
- Org search, status, verificationStatus filters; client-side plan tier filter
- SuperAdmin DNS verify + suspend/reactivate
- Organization profile edit (name, industry, country, registrationNumber)
- Historical trends panel (existing) retained

---

## Broken routes / defects fixed

| Defect | Fix |
|--------|-----|
| Admin dashboard hard-failed if any parallel call threw (`Promise.all`) | `Promise.allSettled` + partial warning |
| Hardcoded KPI fallbacks (95 questions, fake scoped user=1, evidence=0/1) | API values / scoped assessment metadata only |
| `tier` sent as list query (unsupported) | Removed; client-side filter |
| `verificationStatus` only client-filtered | Sent as API query |
| Create payload sent `activePlan` (not in CreateCompanySchema; controller ignores) | Stopped sending; UI clarifies Bronze default |
| Verify success wrote `dnsVerificationStatus` (wrong field) | Writes `verificationStatus` |
| Org Admin could open Onboard (creates tenants they cannot manage under scope) | Onboard button SuperAdmin-only |
| Org detail showed placeholder “John Anderson” / fake phone | Replaced with API or “—” |
| Detail page lacked PATCH edit | Added inline edit |
| Drawer edit pretended to save domain/size/plan | Read-only + schema-aligned PATCH |

---

## SuperAdmin “treated as Auditor” bug

`AuthContext.isAdmin` already includes `SuperAdmin`. Dashboard and layout use `isAdmin ? "Admin" : "Auditor"`, so SuperAdmin correctly calls `/dashboard/admin/*`. Batch 1 reinforced this with comments and Admin-path resilience so a failed companies call cannot blank the admin surface into an Assessor-looking error path.

---

## Remaining stubs / deferred (not Batch 1)

- Users, role change gates, invite restrictions → Batch 2
- Auditor mappings admin page full QA → Batch 2
- Framework mutation UI → Batch 3
- Admin assessment monitoring (metadata-only, no findings links) → Batch 4
- Audit logs / API keys / webhooks polish → Batch 5
- Settings MFA SuperAdmin disable block + nav QA → Batch 6
- Subscription plan mutation UI → **BLOCKED BY BACKEND** (no PATCH plan API)

---

## Role-based behavior (Batch 1)

| Capability | SuperAdmin | Admin | Assessor |
|------------|------------|-------|----------|
| Admin dashboard KPIs | Global | Own org | N/A (auditor dash) |
| Org directory | Global | Own org | Assigned orgs |
| Onboard org | Yes | Hidden in UI | N/A |
| Edit org profile | Yes (scoped) | Own org | No admin edit |
| Verify DNS | Yes | No | No |
| Suspend/activate | Yes | No | No |
| Trends | Yes | Own org (backend) | Assigned (backend) |

---

## Build results (Batch 1)

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (frontend) | **PASS** (exit 0) |
| `npm run build` (Next.js 16.3.7) | **PASS** — compiled successfully; 22 routes generated |
| ESLint | **NOT RUN** — project lint historically misconfigured (Module 1 note) |
| Automated unit tests | **NOT RUN** — no Admin suite targeted |

No production data modified. No deploy performed.

---

## Manual QA (Batch 1)

| Case | Role | Expected | Result |
|------|------|----------|--------|
| Login → Dashboard shows Platform Operations | SuperAdmin | Admin KPIs from API | NEEDS MANUAL |
| Login → Dashboard shows Org Governance | Admin | Tenant KPIs | NEEDS MANUAL |
| Assessor never hits `/dashboard/admin/*` | Assessor | Auditor APIs only | NEEDS MANUAL |
| Organizations list pagination/search | SuperAdmin | Real Mongo rows | NEEDS MANUAL |
| Verification filter hits API | SuperAdmin | Server filter | NEEDS MANUAL |
| Onboard without plan field | SuperAdmin | 201; Bronze default | NEEDS MANUAL |
| Suspend / Verify buttons hidden | Admin | Hidden | NEEDS MANUAL |
| Edit profile saves | Admin/SuperAdmin | PATCH success | NEEDS MANUAL |
| Trends empty state | Any allowed | Empty, not crash | NEEDS MANUAL |

Do not mark PASS from service existence alone.

---

## Backend dependencies

See `docs/ADMIN_SUPERADMIN_BACKEND_DEPENDENCIES.md`.

---

## Client decisions pending

1. Should Org Admin ever onboard sibling companies? (FE currently SuperAdmin-only; backend still authorizes Admin.)
2. Should Admin see maturity **trends/scores** on `/companies/:id/trends`, or metadata-only?
3. Subscription plan assignment UX once a backend endpoint exists.

---

## Final readiness (Batch 1 only)

**Batch 1 frontend readiness: GO for review / manual QA.**  
**Full Admin/SuperAdmin module readiness: NOT READY** until Batches 2–6 complete.

---

## Next step

Await Batch 1 findings acceptance, then start **Batch 2: Users + Auditor Mappings**.
