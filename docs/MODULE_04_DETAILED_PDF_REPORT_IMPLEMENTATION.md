# MODULE 04 — Detailed Dynamic Assessment PDF Report Implementation

## 1. Summary

Backend report generation now produces a multi-page, branded GRAICE Responsible AI Assessment PDF that is fully driven by assessment session data, the bound framework version, organization metadata, scoring snapshots, gaps, and recommendations.

No screenshot sample values (for example DataRobot, fixed control counts, or canned findings) are hardcoded into production report output.

## 2. Architecture

| Layer | Path | Role |
| --- | --- | --- |
| Orchestrator | `backend/src/services/report.service.ts` | Builds PDF buffer, stores file, returns `IReportMetadata` |
| Data aggregation | `backend/src/services/report/reportData.service.ts` | Typed `GraiceReportData` from session/company/framework/users |
| Types | `backend/src/services/report/reportTypes.ts` | Report DTO contracts |
| PDF renderer | `backend/src/services/report/reportPdf.renderer.ts` | Section renderers (PDFKit, A4) |
| Scoring reuse | `backend/src/services/scoring.service.ts` | `calculateScores`, `extractGaps` — not duplicated |
| Brand assets | `backend/assets/report/gcrai-logo.png`, `graice-logo.png` | Header logos |

### API contract (unchanged)

- `POST /api/v1/assessments/:id/report` — generate, persist metadata, audit log
- `GET /api/v1/assessments/:id/report` — download stored file when present; otherwise generate on demand

RBAC remains in `assessment.controller.ts` (Admin blocked from confidential reports; auditor assignment / creator checks).

## 3. Report sections

1. **Cover / header** — logos, title, org name, assessment title, metadata grid (type, status, scope, framework version, generated date, assessment reference, auditor, submitted date when present)
2. **Executive Summary** — template narrative from real KPIs + maturity; four KPI cards (controls assessed, completion %, exceptions noted, not yet assessed)
3. **Status by Pillar** — dynamic pillar rows using the same completion rules as `GET /assessments/:id/progress`
4. **Why Invest in Governance Now** — gray banner + bullets; gap-aware templates; no fabricated compliance claims
5. **Detailed Findings** — every in-scope control grouped by pillar (Control, Tier, Status, Exception, Findings)
6. **Remediation Roadmap** — gaps only; priority + finding + recommendation; no invented owners/dates
7. **Control Detail** — mandatory per-control blocks: question, description, test procedure, evidence/document requests, auditor info, findings, recommendations, framework alignment

## 4. Dynamic data rules

- Organization name from `Company`
- Framework questions/pillars/documentRequests/meetingRequests from the session’s bound version + assessment type
- Immutable submitted `scoreSnapshot` preferred when present; otherwise `ScoringService.calculateScores`
- Gaps via `ScoringService.extractGaps` (AI-landscape / pillar 0 excluded)
- Completion KPIs align with progress-controller logic in `buildPillarProgress`
- Findings prefer auditor `evidenceNotes`; recommendations prefer framework `remediationGuidance`
- Evidence attachment URLs are never printed as public deep links; only a non-sensitive reference note is shown
- Filesystem paths, tokens, and credentials are never embedded in the PDF

## 5. Frontend dependencies

Existing frontend branded client PDF (`frontend/src/lib/graiceAssessmentReportPdf.ts`) remains available for immediate browser download UX.

Server PDF (this module) is what `POST/GET .../report` returns and stores. No API contract change is required for the frontend.

If product wants a single source of truth, point UI download exclusively at `GET /assessments/:id/report` after `POST` generate.

## 6. Verification

### Synthetic sample

```bash
cd backend
npx tsx scratch/generate_sample_report_pdf.ts
```

Writes `backend/uploads/reports/SAMPLE_GRAICE_Report_*.pdf` and prints KPI/pillar/control/gap counts.

### Manual QA checklist

- [ ] Light assessment with gaps
- [ ] Light assessment with zero gaps
- [ ] Full assessment with many controls
- [ ] Partial completion (not-yet-assessed KPIs)
- [ ] Long evidence notes wrap without clipping
- [ ] Multi-page tables repeat headers after page breaks
- [ ] Logos render; footer shows reference + page numbers
- [ ] KPI totals match `/progress`, `/summary`, `/gaps`
- [ ] Org Admin cannot download; assigned auditor can

### Visual QA notes

- White background, navy/teal headings, light-gray table headers, green→teal header rule
- Exception Noted rendered in reddish accent
- Control Detail pages grow dynamically with control count

## 7. Backend changes summary

- Replaced monolithic PDFKit layout with aggregation + section renderer modules
- Controller now loads `conductedBy` for accurate auditor attribution
- GET report again prefers stored file when present
- Added synthetic sample generator under `backend/scratch/`
- Brand assets remain under `backend/assets/report/`

## 8. Remaining product questions

1. Should GET always regenerate (latest layout) or prefer immutable stored PDF after submission?
2. Should Light assessments include Section 1 (AI landscape) profile answers in an appendix?
3. Are recommendation texts from the recommendations API to be persisted on the session, or remain derived at report time?
4. Preferred assessment “system name” field when `framework.title` and `clientContact.title` are both empty?
5. Should frontend stop client-side jsPDF generation and exclusively use the backend PDF for pixel parity?

## 9. Out of scope (per brief)

- No auth/RBAC policy changes
- No scoring algorithm changes beyond reuse
- No published framework content edits
- No automatic deployment
