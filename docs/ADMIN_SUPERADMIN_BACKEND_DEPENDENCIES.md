# GRAICE — Admin & SuperAdmin Backend Dependencies

**Rule:** Frontend-only work. Items below block complete product behavior or require product confirmation against current controllers.

**Date:** 2026-11-03

---

## Blocking / high impact (Batch 1 related)

| ID | Dependency | Impact | Suggested backend work (not done in FE) |
|----|------------|--------|----------------------------------------|
| B1-01 | `POST /companies` does not accept or persist `activePlan` | Onboard UI cannot set Gold/Silver/Bronze; defaults to model default (Bronze) | Extend CreateCompanySchema + controller, or add `PATCH /companies/:id/plan` |
| B1-02 | No registered API to update subscription tier after create | Plan badges are display-only | Add authorized plan update endpoint |
| B1-03 | `GET /companies` has no `tier`/`activePlan` query filter | FE must client-filter after page fetch (incorrect for large directories) | Add optional `activePlan` query filter |
| B1-04 | `GET /dashboard/admin/assessments` has no `companyId` / organization scope query | SuperAdmin header org filter is client-side only on the loaded page | Add optional `companyId` query for SuperAdmin |
| B1-05 | `GET /companies/:id/trends` returns maturity scores / progression | May conflict with “Admin must not see confidential scores” if product applies that to org trends | Confirm policy; possibly redact for Admin role |

---

## Known auth / platform (from Module 1; still relevant)

| ID | Dependency | Impact |
|----|------------|--------|
| M1-01 | OAuth paths can bypass MFA when env configured | SuperAdmin/Admin MFA policy incomplete if SSO used |
| M1-02 | Public `/auth/register` still exposes legacy role options in schema history | Product policy conflict with three-role model |
| M1-03 | Swagger drift vs runtime (historical) | Do not trust Swagger over routes/controllers |

---

## Upcoming batches (preview)

| Batch | Likely backend blockers |
|-------|-------------------------|
| B2 Users | Confirm Admin cannot PATCH another Admin/SuperAdmin; sole-SuperAdmin protection; invite role enum excludes SuperAdmin for Admin callers |
| B2 Mappings | Confirm Admin tenant isolation on list/create/delete |
| B3 Frameworks | Draft lock vs published; delete unused draft rules already in controller — FE must surface errors |
| B4 Assessments | Ensure Admin progress/remind endpoints strip answers; block Admin from findings/report if policy requires |
| B5 API keys | Verify “ReadOnly” permission is enforced server-side before FE claims it |
| B5 Webhooks | Secret hashing / one-time reveal contract |
| B6 Settings | MFA disable denied for Admin **and** SuperAdmin |

---

## Frontend workarounds applied (temporary)

| Item | Workaround |
|------|------------|
| Plan on onboard | Do not send `activePlan`; show “defaults to Bronze” |
| Tier filter on org list | Client-side filter after fetch |
| SuperAdmin org scope on dashboard assessments | Client filter of loaded assessments |
| Org Admin onboard | Hide button (backend still allows Admin create) |

---

## Explicit non-goals

- No backend controller/route/model/scoring/framework/Swagger edits in this workstream.
- No automatic deploy.
