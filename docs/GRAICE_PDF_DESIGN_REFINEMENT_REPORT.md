# GRAICE PDF Design Refinement Report

## 1. Objective

Redesign the GRAICE assessment PDF for client-ready visual quality and fix KPI/data inconsistencies observed in sample reports such as `GRAICE_Report_Globex_Corp_*`.

## 2. Phase 1 — Findings from current PDF / generator

| Issue | Root cause | Resolution |
| --- | --- | --- |
| KPI “61 controls assessed” vs pillar total ~26 | `/summary` used `totalControlsAssessed \|\| overallScore`. Light `overallScore` is a **0–120 point total**, not a control count | Report KPIs now derive only from in-scope pillar progress; summary no longer falls back to `overallScore` |
| KPI “0 exceptions” vs findings showing gaps | Light `scoreSnapshot` omits `totalExceptionsNoted`; summary forced `\|\| 0` | Report exception KPI uses `ScoringService.extractGaps` count; summary uses gaps when snapshot field absent |
| Truncated titles / ellipses | Frontend PDF truncated subtitle at 90 chars | Full wrap; org title capped at ~22pt with multi-line wrap |
| Orphan “Why Invest” heading | Heading drawn then box pushed to next page | Measure full block; keep heading+banner together |
| Weak typography / Helvetica | PDFKit default fonts | Embedded **Source Sans 3** (OFL) Regular/Semibold/Bold under `backend/assets/fonts/` |
| Plain control sections | Minimal separators | Bordered control cards with header badges, section labels, framework alignment panel |
| Findings substituted with question text | Fallback used control description/question | Explicit label: “No auditor observations recorded.” |
| Inconsistent borders / table chrome | Incomplete grid strokes | Full outer border, header fill, cell separators, alternating rows |

## 3. Design system applied

- A4, margins ≈ 18–20 mm
- Colors: navy `#102C3A`, teal `#145568`, accent `#1499A3`, text `#24323D`, secondary `#667583`, border `#D7E0E6`, header `#F1F5F8`, exception `#B45345`
- Fonts: Source Sans 3 embedded
- Logos: `backend/assets/report/gcrai-logo.png`, `graice-logo.png`

## 4. KPI definitions (authoritative for the PDF)

For **in-scope** controls only (excludes AI-landscape / pillar 0):

- **totalControls** = Σ pillar.total  
- **controlsAssessed** = Σ pillar.complete  
- **notYetAssessed** = Σ (notStarted + inProgress)  
- **completionPercentage** = controlsAssessed / totalControls  
- **exceptionsNoted** = `extractGaps(...).length` (same set as Detailed Findings / Remediation)

Maturity / overall score still come from the immutable score snapshot for narrative only — never as a control count.

Automated check: `validateReportConsistency()` in `reportPdf.renderer.ts`.

## 5. Code touched

- `backend/src/services/report/reportData.service.ts` — KPI + findings integrity  
- `backend/src/services/report/reportPdf.renderer.ts` — full visual redesign  
- `backend/src/controllers/assessment.controller.ts` — summary mapping bugfix  
- `backend/assets/fonts/*` — Source Sans 3 TTFs  
- `backend/scratch/generate_sample_report_pdf.ts` — synthetic QA + consistency asserts  
- `backend/scratch/render_pdf_previews.mjs` — PNG page renders via Playwright + pdfjs  
- `frontend/src/lib/graiceAssessmentReportPdf.ts` — aligned client KPI logic (download UX)

Scoring formulas, submission, frameworks, auth/RBAC unchanged.

## 6. Verification results

### Synthetic sample

```bash
cd backend
npx tsx scratch/generate_sample_report_pdf.ts
node scratch/render_pdf_previews.mjs
```

Result (poisoned Light snapshot with `overallScore: 61` intentionally present):

- controlsAssessed **14** (not 61)  
- exceptionsNoted **3** (matches gaps/remediation)  
- pillar totals **7 × 2 = 14**  
- consistency checks **PASS**

Sample PDF: `backend/uploads/reports/SAMPLE_GRAICE_Report_REDESIGN_*.pdf`  
Page previews: `backend/uploads/report-previews/page-XX.png`

### Visual QA notes

- Cover: logos, metadata grid, KPI cards, pillar table — pass  
- Why Invest: kept with banner (no orphan title) — fixed  
- Detailed Findings tables with Exception Noted in muted red — pass  
- Remediation navy banner + bordered table — pass  
- Control cards with badges, procedures, findings, framework alignment — pass  
- Remaining: long Full assessments still produce many pages by design (one detailed card per control)

## 7. Before / after (data)

| Metric (Globex-class Light bug) | Before | After |
| --- | --- | --- |
| Controls assessed | 61 (= overallScore points) | In-scope completed controls only |
| Exceptions noted | 0 (missing Light snapshot field) | Gap count from `extractGaps` |
| Pillar table total | ~26 | Same in-scope set as KPIs |

## 8. Unresolved / product questions

1. Should GET `/report` always regenerate after this redesign (so old stored Globex PDFs are replaced), or keep immutable historical files?  
2. Should Light summary `totalControlsAssessed` exclude landscape answers for API consumers as well (progress already differs by design)?  
3. Prefer HTML/CSS→PDF (Playwright) long-term for even tighter print CSS, or keep PDFKit + embedded fonts?

## 9. Restrictions honored

- No scoring formula changes  
- No submission / framework / auth changes  
- No fabricated assessment facts  
- No automatic deploy  
