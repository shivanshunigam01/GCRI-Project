# GRAICE Assessment & Scoring Verification Tracker

> [!IMPORTANT]
> **Verification Scope**: This tracker audits the **live MongoDB database** (`AssessmentFramework` collection: `Light v2026.1` and `Full v2026.1`) and **backend scoring engine** against the two official source documents:
> 1. **Light Assessment Document**: `Light Assessment-GRAICE Framework Online Questionnaire (1).docx.pdf` (30 Questions)
> 2. **Full Assessment Workbook**: `1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx` (65 Controls across 7 Pillars, 73 Document Requests, 26 Meeting Requests)

---

## 1. Executive Verification Summary

| Area | Source Document Spec | Live Database (`v2026.1`) | Backend Engine Status | Overall Status |
| :--- | :--- | :--- | :--- | :--- |
| **7 GRAICE Pillars** | 7 Pillars (Ethical Leadership → Transparency & Auditability) | ✅ All 7 Pillars match names, numbers (1–7), and order | ✅ Fixed in [`dashboard.controller.ts`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/controllers/dashboard.controller.ts) (`CANONICAL_GRAICE_PILLARS`) | ✅ **100% Verified** |
| **Light Assessment Questions** | 30 Questions (Section 1: Q1–Q4 + Pillars 1–7: Q5–Q30) | ✅ All 30 questions (`LA-01` to `LA-30`) & option labels match PDF | ✅ Section 1 (`pillarNumber: 0`) included in progress (`30/30 = 100%`) & allowed in Zod schema | ✅ **100% Verified** |
| **Light Assessment Scoring** | Max Score `120` (`0–4` per question); Maturity: `0–30`, `31–60`, `61–90`, `91–120` | ✅ Thresholds `30 / 60 / 90 / 120` stored in DB; `0–4` points on all 30 questions | ✅ Auto-derives `scoreValue` from `selectedOptionCode`; excludes Section 1 from `extractGaps()` | ✅ **100% Verified** |
| **Full Assessment Controls** | 65 Controls (`P1-C01` to `P7-C09`) across 7 Pillars with 13 metadata columns | ✅ All 65 controls & all 13 columns (`A`–`M`) match 100% with Excel `Controls Testing` | ✅ Seed script & DB schema capture all 65 controls accurately | ✅ **100% Verified** |
| **Full Assessment Auxiliary Tabs** | `Document Request List` (73 docs) & `Meeting Request List` (26 meetings) | ✅ All 73 Document Requests & 26 Meeting Requests seeded into `Full v2026.1` | ✅ Exposed via `AssessmentFramework` model & `getAssessmentById` | ✅ **100% Verified** |
| **Full Assessment Scoring** | Track `Test Status` (`Not Started`, `In-Progress`, `Complete`) & `Exception Status` (`No Exception Noted`, `Exception Noted`, `Not Assessed`) | ✅ Response options & `AssessmentSession` enums match workbook | ✅ `ScoringService` divides by `totalControls` (`65`), supports pillar weights, and uses dynamic DB `maturityThresholds` (`39/69/89/100`) | ✅ **100% Verified** |

---

## 2. Seven GRAICE Pillars Master Tracker

| Pillar # | Canonical Pillar Name (PDF & Excel) | DB `pillarId` (`AssessmentFramework`) | Light Questions (PDF & DB) | Full Controls (Excel & DB) | [`dashboard.controller.ts`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/controllers/dashboard.controller.ts) Mapping |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **0** *(Sec 1)* | **Organization & AI Landscape** *(Light Only)* | `ai-landscape` | 4 (`LA-01`–`LA-04`) | N/A | ✅ Tracked in `getAssessmentProgress` & `resolvePillarInfo` |
| **1** | **Ethical Leadership** | `ethical-leadership` | 4 (`LA-05`–`LA-08`) | 10 (`P1-C01`–`P1-C10`) | ✅ P1: Ethical Leadership |
| **2** | **Purpose-Driven Innovation** | `purpose-driven-innovation` | 4 (`LA-09`–`LA-12`) | 9 (`P2-C01`–`P2-C09`) | ✅ P2: Purpose-Driven Innovation |
| **3** | **Human-Centric Use** | `human-centric-use` | 4 (`LA-13`–`LA-16`) | 9 (`P3-C01`–`P3-C09`) | ✅ P3: Human-Centric Use |
| **4** | **Responsible Implementation** | `responsible-implementation` | 4 (`LA-17`–`LA-20`) | 10 (`P4-C01`–`P4-C10`) | ✅ P4: Responsible Implementation |
| **5** | **AI Literacy & Workforce Readiness** | `ai-literacy-workforce-readiness` | 4 (`LA-21`–`LA-24`) | 8 (`P5-C01`–`P5-C08`) | ✅ P5: AI Literacy & Workforce Readiness |
| **6** | **Data Governance & Integrity** | `data-governance-integrity` | 4 (`LA-25`–`LA-28`) | 10 (`P6-C01`–`P6-C10`) | ✅ P6: Data Governance & Integrity |
| **7** | **Transparency & Auditability** | `transparency-auditability` | 2 (`LA-29`–`LA-30`) | 9 (`P7-C01`–`P7-C09`) | ✅ P7: Transparency & Auditability |
| **Total** | **7 Pillars (+1 Light Section)** | **7 Pillars in DB** | **30 Questions** | **65 Controls** | ✅ **All 7 Pillars Aligned** |

---

## 3. Light Assessment Verification Tracker (30 Questions)

All 30 questions in MongoDB (`Light v2026.1`) and [`seedFramework.ts`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/scripts/seedFramework.ts) were verified word-for-word against `Light Assessment-GRAICE Framework Online Questionnaire (1).docx.pdf`:

| Q# | DB ID | Section / Pillar | Question Text (PDF & DB) | PDF Options | DB Options & Assigned Score (`scoreValue`) | Text & Option Match | Scoring & Gap Behavior |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **1** | `LA-01` | Section 1: Organization & AI Landscape (`P0`) | How would you describe your organization's AI adoption maturity? | • Exploring AI opportunities<br>• Pilot projects underway<br>• Multiple production AI solutions<br>• AI embedded across business operations | `EXPLORING` (1)<br>`PILOT` (2)<br>`MULTIPLE_PRODUCTION` (3)<br>`EMBEDDED` (4) | ✅ Exact | ✅ Scored `1–4` toward 120 max; excluded from compliance gaps |
| **2** | `LA-02` | Section 1: Organization & AI Landscape (`P0`) | Approximately how many AI use cases are currently in production? | • None<br>• 1-5<br>• 6-20<br>• More than 20 | `NONE` (0)<br>`1_TO_5` (1)<br>`6_TO_20` (2)<br>`MORE_THAN_20` (4) | ✅ Exact | ✅ Scored `0–4` toward 120 max; excluded from compliance gaps |
| **3** | `LA-03` | Section 1: Organization & AI Landscape (`P0`) | Does your organization use Generative AI (e.g., ChatGPT, Copilot, Claude, Gemini)? | • Extensive use<br>• Limited use<br>• Pilot stage<br>• No usage | `EXTENSIVE` (4)<br>`LIMITED` (2)<br>`PILOT` (1)<br>`NO_USAGE` (0) | ✅ Exact | ✅ Scored `0–4` toward 120 max; excluded from compliance gaps |
| **4** | `LA-04` | Section 1: Organization & AI Landscape (`P0`) | Are any AI systems involved in decisions impacting customers, employees, financial outcomes, healthcare, safety, or regulatory obligations? | • Yes<br>• No<br>• Unsure | `YES` (4)<br>`NO` (0)<br>`UNSURE` (0) | ✅ Exact | ✅ Scored `0–4` toward 120 max; excluded from compliance gaps |
| **5** | `LA-05` | Pillar 1: Ethical Leadership (`P1`) | Has executive accountability for AI governance been formally assigned? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF (`Yes=4, No=0, Unsure=0`) |
| **6** | `LA-06` | Pillar 1: Ethical Leadership (`P1`) | Is there an AI governance committee or formal oversight body? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF (`Yes=4, Planned=2, No=0`) |
| **7** | `LA-07` | Pillar 1: Ethical Leadership (`P1`) | Does leadership regularly review AI risks, incidents, and performance metrics? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF |
| **8** | `LA-08` | Pillar 1: Ethical Leadership (`P1`) | Are AI concerns, incidents, or ethical issues escalated through a documented process? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF |
| **9** | `LA-09` | Pillar 2: Purpose-Driven Innovation (`P2`) | Do you maintain an inventory of AI systems and use cases? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF |
| **10** | `LA-10` | Pillar 2: Purpose-Driven Innovation (`P2`) | Does each AI solution have a documented purpose, owner, and expected outcome? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF |
| **11** | `LA-11` | Pillar 2: Purpose-Driven Innovation (`P2`) | Before deploying AI, do you assess whether AI is the most appropriate solution? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **12** | `LA-12` | Pillar 2: Purpose-Driven Innovation (`P2`) | Are risks, benefits, and potential unintended consequences formally assessed? | • Yes<br>• Planned / In Progress<br>• No | `YES` (4), `PLANNED` (2), `NO` (0) | ✅ Exact | ✅ Matches PDF |
| **13** | `LA-13` | Pillar 3: Human-Centric Use (`P3`) | Can humans review, override, or challenge important AI-assisted decisions? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **14** | `LA-14` | Pillar 3: Human-Centric Use (`P3`) | Are users informed when AI significantly influences recommendations or outcomes? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **15** | `LA-15` | Pillar 3: Human-Centric Use (`P3`) | Is there a mechanism for individuals to request review of consequential AI-driven decisions? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **16** | `LA-16` | Pillar 3: Human-Centric Use (`P3`) | Have you assessed potential misuse, harmful outcomes, or unintended consequences from your AI systems? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **17** | `LA-17` | Pillar 4: Responsible Implementation (`P4`) | Are AI systems tested prior to deployment for accuracy, reliability, and performance? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **18** | `LA-18` | Pillar 4: Responsible Implementation (`P4`) | Are AI systems monitored for drift, degradation, or unexpected behavior after deployment? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **19** | `LA-19` | Pillar 4: Responsible Implementation (`P4`) | Is there a documented process for approving model updates, retraining events, or configuration changes? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **20** | `LA-20` | Pillar 4: Responsible Implementation (`P4`) | Is there a dedicated incident response process for AI failures, misuse, or harmful outcomes? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **21** | `LA-21` | Pillar 5: AI Literacy & Workforce Readiness (`P5`) | Have executives received training on AI governance, risk, and regulatory obligations? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **22** | `LA-22` | Pillar 5: AI Literacy & Workforce Readiness (`P5`) | Have technical teams received training on responsible AI development and governance? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **23** | `LA-23` | Pillar 5: AI Literacy & Workforce Readiness (`P5`) | Are employees trained on safe AI usage, limitations, and escalation procedures? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **24** | `LA-24` | Pillar 5: AI Literacy & Workforce Readiness (`P5`) | Are AI-related competencies or skills formally incorporated into workforce development programs? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **25** | `LA-25` | Pillar 6: Data Governance & Integrity (`P6`) | Can you identify the sources, ownership, and authorization status of data used by your AI systems? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **26** | `LA-26` | Pillar 6: Data Governance & Integrity (`P6`) | Have training datasets been evaluated for quality, completeness, accuracy, and representativeness? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **27** | `LA-27` | Pillar 6: Data Governance & Integrity (`P6`) | Is AI data lineage documented from original source through model input? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **28** | `LA-28` | Pillar 6: Data Governance & Integrity (`P6`) | Have you assessed AI training or operational data for bias, privacy, or legal/compliance risks? | • Yes<br>• Planned / In Progress<br>• No<br>• Unsure | `YES` (4), `PLANNED` (2), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **29** | `LA-29` | Pillar 7: Transparency & Auditability (`P7`) | Could your organization demonstrate how AI systems are governed, approved, monitored, and controlled during an audit or regulatory review? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |
| **30** | `LA-30` | Pillar 7: Transparency & Auditability (`P7`) | Are governance decisions, risk assessments, monitoring results, and approvals documented and retrievable? | • Yes<br>• No<br>• Unsure | `YES` (4), `NO` (0), `UNSURE` (0) | ✅ Exact | ✅ Matches PDF |

---

## 4. Full Assessment Verification Tracker (65 Controls, 73 Document Requests, 26 Meeting Requests)

All **65 controls**, **73 document requests**, and **26 meeting requests** in MongoDB (`Full v2026.1`) and [`seedFramework.ts`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/scripts/seedFramework.ts) were verified field-by-field against `1784783614262-GRAICE_Framework_Assessment_Workbook_2026.xlsx`.

### 4.1 Pillar-by-Pillar Full Control Verification Summary

| Pillar # | Pillar Name | Control IDs | Count | Key Question Ref (Col D) | Control Desc (Col E) | Test Procedure (Col F) | Org Scope (Col G) | Linked Docs (Col H) | Assurance Tier (Col I) | Regulatory Alignments (Cols J–M) | DB Match |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **Ethical Leadership** | `P1-C01` – `P1-C10` | **10** | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **2** | **Purpose-Driven Innovation** | `P2-C01` – `P2-C09` | **9** | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **3** | **Human-Centric Use** | `P3-C01` – `P3-C09` | **9** | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **4** | **Responsible Implementation** | `P4-C01` – `P4-C10` | **10** | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **5** | **AI Literacy & Workforce Readiness** | `P5-C01` – `P5-C08` | **8** | ✅ 8/8 | ✅ 8/8 | ✅ 8/8 | ✅ 8/8 | ✅ 8/8 | ✅ 8/8 | ✅ 8/8 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **6** | **Data Governance & Integrity** | `P6-C01` – `P6-C10` | **10** | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 | ✅ 10/10 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **7** | **Transparency & Auditability** | `P7-C01` – `P7-C09` | **9** | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 (EU, NIST, ISO, OECD) | ✅ **100%** |
| **Total** | **All 7 Pillars** | **`P1-C01` – `P7-C09`** | **65** | ✅ **65/65** | ✅ **65/65** | ✅ **65/65** | ✅ **65/65** | ✅ **65/65** | ✅ **65/65** | ✅ **65/65** | ✅ **100%** |

---

## 5. Scoring Logic & Maturity Classification Tracker

### 5.1 Light Assessment Scoring Logic Tracker

| Rule / Metric | Official PDF Document Spec | Current Database & Backend Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Response Score Values** | • `Yes / Fully Implemented`: **4**<br>• `Partially Implemented`: **3**<br>• `Planned / In Progress`: **2**<br>• `No / Not Implemented`: **0**<br>• `Unsure`: **0** | • `seedFramework.ts`: `YES=4`, `PLANNED=2`, `NO=0`, `UNSURE=0` (Matches PDF per-question bullets)<br>• `adminFramework.controller.ts`: default options set to `YES=4, PARTIAL=3, PLANNED=2, NO=0, UNSURE=0` | ✅ |
| **Max Possible Score** | **120** (30 questions × 4 points max) | **120** (`maturityThresholds.advancedMax = 120`) | ✅ |
| **Section 1 (Q1–Q4) Progress & Scoring** | 4 questions in Section 1 (`LA-01`–`LA-04`) + 26 questions in Pillars 1–7 (`LA-05`–`LA-30`) = 30 questions total | Included in `getAssessmentProgress` (`pillarBreakdown` prepends Section 1 `ai-landscape`) so completion reaches `30/30` (**100%**). | ✅ |
| **Maturity Level Thresholds** | • **Initial**: `0–30`<br>• **Emerging**: `31–60`<br>• **Established**: `61–90`<br>• **Advanced**: `91–120` | `initialMax: 30`, `emergingMax: 60`, `establishedMax: 90`, `advancedMax: 120`<br>• `totalScore <= 30` → `Initial`<br>• `30 < totalScore <= 60` → `Emerging`<br>• `60 < totalScore <= 90` → `Established`<br>• `totalScore > 90` → `Advanced` | ✅ |
| **Answer Saving (`scoreValue` lookup)** | Selected response option determines question score (`0–4`) | `assessment.controller.ts` (`saveAnswers`) and `ScoringService` deterministically derive `scoreValue` from `framework.questions[q].responseOptions` by `selectedOptionCode`. | ✅ |
| **Gap / Exception Extraction** | Identify governance gaps where controls are not implemented | `scoring.service.ts` (`extractGaps`) skips Section 1 (`pillarNumber === 0` / `pillarId === "ai-landscape"`) profile questions and only flags Pillar 1–7 zero-score controls. | ✅ |

---

### 5.2 Full Assessment Scoring Logic Tracker

| Rule / Metric | Official Excel Workbook Spec (`Dashboard` & `How to Use`) | Current Database & Backend Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Test Status Tracking** | Per Pillar & Overall:<br>• `Not Started`<br>• `In-Progress`<br>• `Complete`<br>• `Completion % = Complete / Total Controls` | Tracked via `testStatus` (`NotStarted`, `InProgress`, `Complete`) in `AssessmentSession.answers` and `getAssessmentProgress`. | ✅ |
| **Exception Status Tracking** | Per Pillar & Overall:<br>• `No Exception Noted`<br>• `Exception Noted`<br>• `Not Assessed` | Tracked via `exceptionStatus` (`NoExceptionNoted`, `ExceptionNoted`, `NotAssessed`) in `AssessmentSession.answers` and `ScoringService`. | ✅ |
| **Pillar & Overall Compliance % Formula** | Excel `Dashboard` (`C34:C35`) divides by total controls (`65`), requiring all controls in scope to be evaluated. | `scoring.service.ts` divides `noExceptions` by `totalControls` (`65`), preventing partial assessments (e.g., 1/65) from achieving 100% Advanced maturity. | ✅ |
| **Dynamic Maturity Thresholds** | DB stores `maturityThresholds`:<br>• `initialMax: 39` (`0–39%`)<br>• `emergingMax: 69` (`40–69%`)<br>• `establishedMax: 89` (`70–89%`)<br>• `advancedMax: 100` (`90–100%`) | `scoring.service.ts` reads `framework.maturityThresholds` dynamically in `calculateFullAssessmentScores`. | ✅ |
| **Pillar Weights** | DB `pillars[].weight` (default `1` per pillar, configurable by Admin via `PUT /pillars`) | `ScoringService` supports weighted pillar averages when custom weights (`weight !== 1`) are configured. | ✅ |
| **Auditor Dashboard Pillar Progress** | Show completion % across each of the 7 GRAICE Pillars | `dashboard.controller.ts` uses `CANONICAL_GRAICE_PILLARS` (1–7) matching both `pillarId` and `pillarNumber`. | ✅ |

---

## 6. Actionable Remediation Checklist

- [x] **Database Questions & Controls Seed (`v2026.1`)**: Verified 100% accurate (30 Light questions + 65 Full controls + 73 Document Requests + 26 Meeting Requests match source documents).
- [x] **Fix 1 — Light Assessment Completion % (`assessment.controller.ts`)**: Included Section 1 (`LA-01`–`LA-04`, `pillarId: "ai-landscape"`) in `getAssessmentProgress` so completion reaches 100% (30/30).
- [x] **Fix 2 — Auto-Derive `scoreValue` & `exceptionStatus` on Save (`assessment.controller.ts`)**: `saveAnswers` now looks up the question's `responseOptions` by `selectedOptionCode` to set the canonical `scoreValue` and `exceptionStatus` automatically.
- [x] **Fix 3 — Exclude Section 1 Profile Questions from Governance Gaps (`scoring.service.ts`)**: `extractGaps()` now skips `pillarId === "ai-landscape"` (`pillarNumber === 0`) so organizations answering "None" / "No GenAI usage" / "No high-impact AI" in Section 1 aren't flagged with compliance exceptions.
- [x] **Fix 4 — Full Assessment Compliance Denominator & Thresholds (`scoring.service.ts`)**: `calculateFullAssessmentScores` now uses `framework.maturityThresholds`, supports custom pillar weights, and computes compliance across all active controls (`65`).
- [x] **Fix 5 — Fix Pillar Names & IDs in Dashboard Controller (`dashboard.controller.ts`)**: Aligned all 7 Pillar names, numbers, and `pillarId` lookups with the official GRAICE Framework.
- [x] **Fix 6 — Admin Framework Default Options & Thresholds (`adminFramework.controller.ts`, `adminFramework.schema.ts`)**: Fixed `Partially Implemented` default score (`3`), Full Assessment default option codes (`NO_EXCEPTION_NOTED`, `EXCEPTION_NOTED`, `NOT_ASSESSED`), Full Assessment default thresholds (`39/69/89/100`), and allowed `pillarNumber: 0` in `adminFramework.schema.ts`.
