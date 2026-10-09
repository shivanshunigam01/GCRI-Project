# GRAICE Assessment Platform — Frontend Architecture, Style Guide & Implementation Master Plan (`frontend.md`)

> **Document Type:** Master Frontend Engineering Specification & Style Guide  
> **Target System:** GCRAI / GRAICE Responsible AI Governance Assessment Platform  
> **Source Baseline:** `GRAICE_Project_Delivery_Plan_v1.2_Client_Changes.pdf` & `scratch/frontendImages` (Screens 1–7)  
> **Framework:** Next.js (App Router, TypeScript), Tailwind CSS, Lucide Icons

---

## 1. Project Vision & Role Personas

The **GRAICE Assessment Platform** digitizes the GCRAI Responsible AI governance audit methodology. It replaces error-prone Excel workbooks and Word questionnaires with a persistent, database-backed enterprise cockpit.

### Role Personas & Experience Separation
1. **Assessor / Auditor (e.g., Piyush Napit):**
   - Main workspace: Evaluates organization AI controls across the 7 GRAICE Pillars.
   - Primary views: **Screen 1** (Workload Dashboard), **Screen 2** (Organizations Directory), **Screens 3 & 4** (Assessment Cockpit), **Screen 5** (Findings Hub).
   - Strict requirement: Full access to confidential control questions, evidence files, test responses, and gap recommendations.
2. **Platform Administrator (Super Admin):**
   - Main workspace: Platform oversight, framework configuration, user and company provisioning.
   - Primary view: **Screen 7** (Super Admin Operational Panel).
   - Strict requirement (**Post-Milestone 3 Security Policy**): Zero access to confidential assessment answers, evidence files, or sensitive findings. Admin views must display *only* operational metadata (dates, counts, statuses, company names).
3. **Company Governance Lead / Active Client:**
   - Main workspace: Monitors compliance score, provides client contact details, manages subscriptions and tier quotas.
   - Primary view: **Screen 6** (Assurance / Tier Dashboard).

---

## 2. Single-Source-of-Truth Modular Color System

To achieve complete modularity, all colors are defined using **CSS Custom Properties (Variables)** in the HSL (Hue, Saturation, Lightness) color space.

> [!IMPORTANT]
> **Single Source of Truth Mechanism:**
> By updating just the core hue values (`--primary-h`, `--accent-h`, `--success-h`, etc.) in `:root`, the entire application—including text, borders, backgrounds, charts, badges, and button states—re-themes automatically without modifying individual component files.

### 2.1 CSS Custom Properties Architecture (`globals.css`)

```css
:root {
  /* ==========================================================================
     1. BRAND PRIMARY TOKENS (Midnight Slate / Corporate Navy)
     Single change to --primary-h updates all dark headers, sidebars & primary CTAs
     ========================================================================== */
  --primary-h: 222; /* Slate Blue Hue */
  --primary-s: 47%;
  
  --primary: hsl(var(--primary-h), var(--primary-s), 11%);          /* #0f172a - Sidebar & Main Headings */
  --primary-hover: hsl(var(--primary-h), var(--primary-s), 16%);    /* #1e293b - Interactive hover state */
  --primary-active: hsl(var(--primary-h), var(--primary-s), 8%);    /* #090d16 - Pressed state */
  --primary-subtle: hsl(var(--primary-h), var(--primary-s), 96%);   /* #f1f5f9 - Light tinted surfaces */
  --primary-foreground: hsl(0, 0%, 100%);                           /* #ffffff - Text on primary */

  /* ==========================================================================
     2. ACCENT & INTERACTIVE TOKENS (Vibrant AI Blue)
     Single change to --accent-h updates all links, progress rings, and active tabs
     ========================================================================== */
  --accent-h: 221; /* High-trust tech blue */
  --accent-s: 83%;
  
  --accent: hsl(var(--accent-h), var(--accent-s), 53%);             /* #2563eb - Primary Action Accent */
  --accent-hover: hsl(var(--accent-h), var(--accent-s), 45%);       /* #1d4ed8 - Button Hover */
  --accent-subtle: hsl(var(--accent-h), var(--accent-s), 96%);      /* #eff6ff - Pill & selection tint */
  --accent-border: hsl(var(--accent-h), var(--accent-s), 84%);      /* #bfdbfe - Active focus rings */
  --accent-foreground: hsl(0, 0%, 100%);

  /* ==========================================================================
     3. SEMANTIC STATUS TOKENS
     Modular hues for Pass/Fail, Severity levels, and Assessment Progress
     ========================================================================== */
  /* SUCCESS (Pass / Valid / Completed / Exemplary / Active Client) */
  --success-h: 158; /* Emerald */
  --success-s: 64%;
  --success: hsl(var(--success-h), var(--success-s), 40%);          /* #10b981 */
  --success-bg: hsl(var(--success-h), var(--success-s), 96%);       /* #ecfdf5 */
  --success-border: hsl(var(--success-h), var(--success-s), 82%);   /* #a7f3d0 */
  --success-text: hsl(var(--success-h), var(--success-s), 24%);     /* #065f46 */

  /* WARNING (Exception / Needs Attention / Medium Severity / Pending) */
  --warning-h: 38; /* Amber */
  --warning-s: 92%;
  --warning: hsl(var(--warning-h), var(--warning-s), 48%);          /* #f59e0b */
  --warning-bg: hsl(var(--warning-h), var(--warning-s), 96%);       /* #fffbeb */
  --warning-border: hsl(var(--warning-h), var(--warning-s), 82%);   /* #fde68a */
  --warning-text: hsl(var(--warning-h), var(--warning-s), 28%);     /* #92400e */

  /* DANGER / CRITICAL (Fail / High Severity / Open Finding / Overdue) */
  --danger-h: 0; /* Rose / Carmine */
  --danger-s: 84%;
  --danger: hsl(var(--danger-h), var(--danger-s), 55%);             /* #ef4444 */
  --danger-bg: hsl(var(--danger-h), var(--danger-s), 97%);          /* #fef2f2 */
  --danger-border: hsl(var(--danger-h), var(--danger-s), 86%);      /* #fecaca */
  --danger-text: hsl(var(--danger-h), var(--danger-s), 32%);        /* #991b1b */

  /* INFO (In Progress / In Review / Metadata) */
  --info-h: 217; /* Cyan / Blue */
  --info-s: 91%;
  --info: hsl(var(--info-h), var(--info-s), 55%);                /* #3b82f6 */
  --info-bg: hsl(var(--info-h), var(--info-s), 97%);             /* #eff6ff */
  --info-border: hsl(var(--info-h), var(--info-s), 85%);         /* #dbeafe */
  --info-text: hsl(var(--info-h), var(--info-s), 28%);           /* #1e40af */

  /* NEUTRAL (Not Started / N/A / Deferred) */
  --neutral-h: 215;
  --neutral-s: 16%;
  --neutral: hsl(var(--neutral-h), var(--neutral-s), 47%);          /* #64748b */
  --neutral-bg: hsl(var(--neutral-h), var(--neutral-s), 97%);       /* #f8fafc */
  --neutral-border: hsl(var(--neutral-h), var(--neutral-s), 88%);   /* #e2e8f0 */
  --neutral-text: hsl(var(--neutral-h), var(--neutral-s), 25%);     /* #334155 */

  /* ==========================================================================
     4. SUBSCRIPTION PLAN TIERS (Screen 6 Alignment)
     ========================================================================== */
  --tier-bronze: #b45309;
  --tier-bronze-bg: #fffbeb;
  --tier-bronze-border: #fde68a;

  --tier-silver: #475569;
  --tier-silver-bg: #f8fafc;
  --tier-silver-border: #cbd5e1;

  --tier-gold: #d97706;
  --tier-gold-bg: #fefce8;
  --tier-gold-border: #fef08a;

  /* ==========================================================================
     5. SURFACES, ELEVATION & LAYOUT BORDERS
     ========================================================================== */
  --bg-app: #f8fafc;           /* Global Canvas Surface */
  --bg-surface: #ffffff;       /* Pure White Card Containers */
  --bg-sidebar: #0f172a;       /* Dark Midnight Sidebar */
  --border-subtle: #e2e8f0;    /* Card and Table Borders */
  --border-divider: #f1f5f9;   /* Section Dividers */

  --text-main: #0f172a;        /* Primary Body & Title Text */
  --text-muted: #64748b;       /* Labels, Timestamps & Subtext */
  --text-subtle: #94a3b8;      /* Placeholder & De-emphasized Text */

  /* ==========================================================================
     6. RADII, SHADOWS & MOTION
     ========================================================================== */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02);
  --shadow-hover: 0 6px 20px 0 rgba(0, 0, 0, 0.06);
  --shadow-drawer: -6px 0 24px -2px rgba(15, 23, 42, 0.12);

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2.2 Re-Theming Example
If GCRAI decides to brand the platform in **Forest Jade** instead of Midnight Navy, simply change:
```css
:root {
  --primary-h: 165; /* Forest Green base */
  --accent-h: 172;  /* Teal accent */
}
```
The entire application (sidebar, buttons, progress rings, headers, borders) shifts harmoniously without breaking contrast or requiring code refactoring.

---

## 3. Typography & Micro-Layout System

* **Primary Font:** `Inter` or `Plus Jakarta Sans` for clean, professional data-heavy UI.
* **Monospace Font:** `JetBrains Mono` or system `font-mono` for Control IDs (`GCRAI-001.3`), Finding IDs (`FND-2026-001`), dates (`03 Oct 2026`), and numeric percentages (`64%`).
* **Visual Hierarchy Standards:**
  - Page Titles: `text-2xl font-extrabold tracking-tight text-slate-900`
  - Section Headings: `text-sm font-bold uppercase tracking-wider text-slate-500`
  - Table Headers: `text-[10px] font-semibold uppercase tracking-wider text-slate-500`
  - Body Text: `text-xs sm:text-sm text-slate-600 leading-relaxed`
  - Micro Badges: `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full`

---

## 4. Screen-by-Screen Implementation Specifications

### Screen 1: Auditor Workload Dashboard (`/dashboard`)
* **Purpose:** The daily operational cockpit for Assessors to track in-flight assessments, tasks, and client health.
* **Component Breakdown:**
  1. `GreetingHero`: Dynamic time-based greeting, user name, date chip, and inspirational quote.
  2. `WorkloadKpiGrid`: 5 cards (Total Assessments: 12, In Progress: 5, Completed: 6, Findings: 3, Organizations: 8).
  3. `AssessmentProgressDonut`: 64% overall completion SVG donut with breakdown legend.
  4. `PillarPerformanceBars`: 7 horizontal progress bars with animated color-coded fills:
     - Ethical Leadership (78%)
     - Data Governance (62%)
     - Purpose-Driven Innovation (54%)
     - Human-Centric Use (48%)
     - Responsible Implementation (71%)
     - AI Literacy & Workforce Readiness (40%)
     - Transparency & Auditability (66%)
  5. `AssessmentsOverviewBarChart`: Stacked bar chart showing monthly volumes (Apr–Sep).
  6. `AssessmentTypesDonut`: Donut chart showing Full (58%) vs. Light (42%).
  7. `UpcomingTasksList`: Date square blocks (`OCT 04`, `OCT 06`), organization tags, priority badges.
  8. `MyOrganizationsWidget`: Mini table of active client entities with quick status.
  9. `LatestFindingsWidget`: Mini table with severity pills (`High`, `Medium`, `Low`).
  10. `ContinueAssessmentHeroCard`: Architectural glass building background, pending assessment counter, direct deep-link button.

---

### Screen 2: Organizations Directory & Slide-Over Drawer (`/organizations`)
* **Purpose:** Comprehensive organization catalog, DNS verification status, and deep detail drawer.
* **Component Breakdown:**
  1. `OrganizationStatsBanner`: 4 stat cards (Total Organizations: 8, Active Clients: 5, In Progress: 3, Completed: 12).
  2. `FilterBar`: Search input, Industry filter, Status filter, Assessment Type filter, Reset button.
  3. `OrganizationsTable`: Monogram avatars (`ABC`, `TS`), location, industry icon pill, assessment counts, latest assessment tag, status pill, row action dropdown menu.
  4. `OrganizationDetailDrawer`: Right slide-over panel with 4 tabs:
     - `Overview`: Industry, company size, website (external link), contact person, email, phone, address, and edit trigger.
     - `Assessments`: Summary grid (Total: 2, Completed: 1, In Progress: 1, Not Started: 0) and Latest Assessment highlight card with 68% progress bar.
     - `People`: Assigned assessors and company leads.
     - `Documents`: Governance documents and compliance certificates.
  5. `OnboardOrganizationModal`: Accessible dialog form with real-time domain DNS checking.

---

### Screens 3 & 4: Assessment Execution Workspace (`/assessments/[id]`)
* **Purpose:** The core evaluation interface supporting both Light (30 questions) and Full (65+ controls) assessments.
* **Layout:** High-density, 3-column evaluation cockpit.
* **Component Breakdown:**
  1. **Top Bar:** Breadcrumbs, assessment title, status pill (`In Progress`), metadata chips (Org, Type, Version, Plan, Due Date), auto-save status indicator, and global 64% progress bar with metric counts.
  2. **Left Column (Navigation Tree):**
     - Tab switcher: `Pillars` | `All Questions`.
     - 7 Pillars Accordion with subdomains (e.g., `1.1 Governance & Accountability 4/5`).
     - Control Stepper List with checkmarks (`GCRAI-001.1` to `GCRAI-001.5`).
  3. **Center Column (Control Evaluation):**
     - Pillar & Subdomain header with question counter (`Question 3 of 5`) and `< >` navigation.
     - Control ID badge (`GCRAI-001.3`) & Assurance Tiers (`Tier 1`, `Tier 2`).
     - Question Prompt & Subtext description.
     - `Verification Guidance` info callout card.
     - `Expected Evidence` checklist card.
     - **Auditor Response Segmented Buttons:** `Pass` (emerald), `Fail` (rose), `Exception` (amber), `N/A` (neutral).
     - Test Date picker & Tested By selector.
     - "Reason for Failure / Exception" textarea (conditionally highlighted).
  4. **Right Column (Evidence & Notes):**
     - `EvidencePanel`: Tabs for `Uploaded (2)`, `Linked (0)`, `Suggested (3)`, file cards with size, upload date, and `Valid` badge.
     - `LinkExistingEvidenceDrawer` (Screen 4): Searchable modal to link existing files.
     - `NotesAndFindingsPanel`: Tabs for `Auditor Notes` (with rich-text toolbar) and `Findings` (with `+ Add Finding` trigger).
     - `ControlInformationCard`: Related standards (`EU AI Act`, `NIST`, `ISO/IEC 42001`, `OECD`) and keyword tags.

---

### Screen 5: Findings & Exceptions Management Hub (`/assessments/[id]/findings`)
* **Purpose:** Track, triage, assign, and resolve compliance gaps and exceptions identified during an assessment.
* **Component Breakdown:**
  1. `FindingsStatsBanner`: 4 stat cards (Total: 8, Open: 3, In Progress: 2, Resolved: 2).
  2. `FindingsFilterBar`: Search input, Status filter, Severity filter, Pillar filter, Assignee filter, Reset button.
  3. `FindingsTable`: Checkbox, Finding ID (`FND-2026-001`), Title & snippet, Pillar/Control reference, Severity badge, Status badge, Assignee avatar, Due Date (strikethrough when resolved), Row menu.
  4. `FindingDetailDrawer`: Slide-over drawer with 4 tabs:
     - `Details`: Severity and Status dropdowns, associated question prompt, assignee picker, calendar due date picker, tags, description textarea, and **Recommended Action Callout Box**.
     - `Evidence`: Attached non-compliance evidence files.
     - `Discussion`: Internal threaded auditor comments.
     - `Activity`: Audit trail of changes.
     - Bottom CTAs: `Update Finding` and `Mark as Resolved`.

---

### Screen 6: Assurance / Tier Dashboard & Subscription Management (`/assurance`)
* **Purpose:** Manage question quotas, billing tiers, and usage analytics for the organization.
* **Component Breakdown:**
  1. `OrganizationPlanCard`: Active plan badge (Bronze), member since, next billing date, active status, upgrade button.
  2. `SubscriptionTierCards`: Bronze (10 Questions), Silver (20 Questions), Gold (50 Questions) with feature checklists and upgrade CTAs.
  3. `UsageMetricsBar`: Total Assessments (6), Questions Used (42/60 with 70% progress bar), Active Assessments (2), Completed (3), Remaining Questions (18).
  4. `QuestionUsageTrendChart`: Stacked monthly bar chart of used vs. remaining capacity.
  5. `AssessmentStatusDonut`: Completed 50%, In Progress 33%, Not Started 17%.
  6. `TierComparisonMatrix`: Detailed feature comparison table across plans.
  7. `RecentAssessmentsUsageTable`: Assessment list with question usage progress bars.

---

### Screen 7: Super Admin Operational Panel (`/admin`)
* **Purpose:** Platform-wide oversight and configuration for platform administrators.
* **Component Breakdown:**
  1. `AdminHeader`: Date range selector (`01 Oct 2026 - 31 Oct 2026`).
  2. `AdminKpiGrid`: 12 KPI metric cards (Users: 156, Auditors: 24, Organizations: 48, Assessments: 62, Versions: 8, Pillars: 7, Controls: 86, Questions: 245, Evidence: 320, Reports: 42, Subscriptions: 86, Roles: 6).
  3. `AdminChartsRow`: Assessments by Status donut, Subscription Distribution donut, 6-Month Creation stacked bar chart.
  4. `RecentOrganizationsTable`: Organization name, plan chip, assessment count, user count, status pill, actions.
  5. `AdminAuditActivityFeed`: Real-time administrative event stream with actor names, actions, and timestamps.
  6. `NonConfidentialAssessmentsTable`: Oversight table listing organization, auditor, type, status, and dates (strictly excluding confidential answers and scores).

---

## 5. Critical Project Nuances & Engineering Best Practices

### Nuance 1: Strict Confidentiality Isolation (Post-Milestone 3 Mandate)
- **Principle:** Administrative staff must never see confidential client answers, scores, evidence documents, or detailed findings.
- **Frontend Enforcement:**
  - The `/admin` routes must *only* consume the dedicated admin endpoints ([`getAdminDashboardSummary`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/controllers/dashboard.controller.ts#L16) and [`getAdminDashboardAssessments`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/controllers/dashboard.controller.ts#L121)).
  - These endpoints automatically strip the `answers` and `scoreSnapshot` fields.
  - The UI must not provide any drill-down link from the Admin Panel to the confidential Assessment Workspace ([`/assessments/[id]`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/routes/assessment.routes.ts#L131)).

### Nuance 2: Debounced Background Auto-Save Engine
- In the Assessment Workspace, typing auditor notes or selecting a response must not block the UI or trigger full-page re-renders.
- **Implementation Pattern:**
  - Store answers in a local React state cache.
  - Trigger an optimistic UI update immediately.
  - Debounce the network call to [`PUT /api/v1/assessments/:id/answers`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/routes/assessment.routes.ts#L158) by **1,500ms**.
  - Show an animated pulsing indicator: `"Saving..."` → `"Auto-saved just now"`.

### Nuance 3: URL-Driven State for Tables, Drawers & Steppers
- All filter bars, searches, pagination, active tabs, and question indices must sync with URL search params:
  - `/organizations?search=acme&status=Active&page=1`
  - `/assessments/64b8f0a2?pillar=P1&q=3`
  - `/assessments/64b8f0a2/findings?drawer=FND-2026-001`
- **Benefits:**
  - Shareable links for team collaboration.
  - Browser back/forward buttons work naturally.
  - Refreshing the page preserves the exact evaluation state.

### Nuance 4: S3 Presigned URL Upload Flow for Evidence
- Never upload large policy PDFs or audit zip files through the Next.js server memory.
- **Workflow:**
  1. Call [`POST /api/v1/assessments/:id/evidence/presigned-url`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/routes/assessment.routes.ts#L273) to receive an authorized AWS S3 upload URL.
  2. Perform a direct client-to-S3 `PUT` request with progress tracking (`0%` → `100%`).
  3. Register the permanent S3 key with the assessment control response.

### Nuance 5: DNS Legitimacy Verification Loop
- When onboarding an organization in Screen 2:
  - After user inputs a domain (e.g., `company.com`), trigger an asynchronous DNS verification call ([`POST /api/v1/companies/:id/verify`](file:///c:/Users/HP/Desktop/gcri-project/backend/src/routes/company.routes.ts#L182)).
  - Display intermediate status (`"Verifying MX & A records..."`) with a spinner.
  - Render an emerald badge (`"DNS Verified"`) or amber badge (`"DNS Unverified"`) without locking the onboarding modal.

---

## 6. Frontend Milestone Delivery Tracker

| Milestone | Key Deliverables | Estimated Scope |
| :--- | :--- | :--- |
| **FM-1: Design Tokens, Primitives & Shell** | `:root` modular HSL color system in `globals.css`, UI atoms (`Button`, `Badge`, `Card`, `SlideOver`, `Modal`), multi-role `AppSidebar`, `AppHeader`, `Breadcrumb`. | 3–4 Days |
| **FM-2: Organizations Directory & Drawer** | Screen 2 table, search & filter toolbar, 4-tab `OrganizationDetailDrawer`, DNS verification trigger, and `OnboardCompanyModal`. | 3–4 Days |
| **FM-3: Auditor Workload Dashboard** | Screen 1 greeting banner, 5 KPI cards, 64% SVG donut, 7-pillar horizontal progress bars, upcoming task widgets, and "Continue Assessment" card. | 3–4 Days |
| **FM-4: Assessment Execution Workspace** | Screens 3 & 4 3-column workspace, pillar navigation tree, control stepper, guidance accordions, response buttons, evidence upload, linking drawer, notes editor. | 5–6 Days |
| **FM-5: Findings & Exceptions Hub** | Screen 5 summary cards, multi-dimension filter toolbar, findings table, slide-over finding editor with Details, Evidence, Discussion, Activity tabs. | 3–4 Days |
| **FM-6: Assurance / Tier Dashboard** | Screen 6 plan cards, Bronze/Silver/Gold tier cards, question quota progress gauges, question usage trend chart, tier comparison matrix. | 3–4 Days |
| **FM-7: Super Admin Operational Panel** | Screen 7 12-card KPI grid, status/subscription donuts, 6-month stacked bar chart, recent organizations table, live administrative audit stream. | 3–4 Days |
| **FM-8: Hardening, a11y & E2E Polish** | RBAC route guarding, shimmer skeletons (CLS < 0.1), keyboard navigation (`Tab`/Arrows), error boundaries, and production build optimization. | 3–4 Days |

---

## 7. Testing Points & Quality Assurance Checklist

### 7.1 Unit & Formatting Tests
- [ ] **Maturity Score Calculation Display:** Ensure scores out of 120 (Light) and percentage compliance (Full) format correctly without decimal artifacts.
- [ ] **Status Badge Styling:** Verify that each status string maps to the correct modular CSS classes (`Compliant`, `Action Needed`, `In Progress`, `Pass`, `Fail`, `Exception`).
- [ ] **Date & Currency Formatters:** Verify dates display in standard format (`03 Oct 2026`) and respect locale settings.

### 7.2 Component & Interaction Tests
- [ ] **Slide-Over Drawer:** Test ESC key dismiss, backdrop click dismiss, smooth transition in/out, and tab switching without layout shift.
- [ ] **Multi-Filter Bar:** Test typing into search with debounce, selecting multiple dropdown filters, and clicking "Reset" to return to baseline.
- [ ] **Segmented Response Buttons:** Ensure selecting `Pass`, `Fail`, `Exception`, or `N/A` updates active states, toggles failure reason textarea, and triggers auto-save.
- [ ] **Pillar Navigation Accordion:** Test expanding/collapsing pillars, clicking subdomains, and verifying question completion counts update dynamically.

### 7.3 Integration & End-to-End User Journeys
- [ ] **Journey 1: Organization Onboarding & Verification:**
  - Create company → Verify DNS → Confirm company appears in Screen 2 with "Verified" badge.
- [ ] **Journey 2: Assessment Execution & Auto-Save:**
  - Open assessment from Screen 1 or 2 → Answer controls in Screen 3 → Verify auto-save network calls → Refresh page → Verify answers persist.
- [ ] **Journey 3: Evidence Attachment & Linking:**
  - Upload PDF evidence → Link existing document from library (Screen 4) → Verify file chips appear under "Uploaded" and "Linked" tabs.
- [ ] **Journey 4: Finding Creation & Resolution:**
  - Select "Exception" on a control → Click "+ Add Finding" → Open Screen 5 → Locate finding → Update status to "Resolved" → Verify due date strikethrough and KPI recalculation.
- [ ] **Journey 5: Subscription Tier Upgrade:**
  - Navigate to Screen 6 → Click "Upgrade to Gold" → Confirm quota gauges update to 50 questions.

### 7.4 Security, RBAC & Confidentiality Tests
- [ ] **Admin Confidentiality Isolation:** Log in as Admin → Navigate to `/admin` → Inspect network tab to verify zero assessment responses, evidence URLs, or findings are returned.
- [ ] **Assessor Scope Guard:** Log in as Assessor → Attempt to navigate to `/admin` → Verify redirect to `/dashboard` with 403 toast alert.
- [ ] **Cross-Company Access Prevention:** Verify Assessors only view organizations and assessments assigned to them.

### 7.5 Accessibility (WCAG 2.1 AA) & Performance Tests
- [ ] **Keyboard Navigation:** Complete an entire assessment using only `Tab`, `Shift+Tab`, `Enter`, `Space`, and Arrow keys.
- [ ] **Color Contrast:** All text must meet a minimum contrast ratio of **4.5:1** against backgrounds (verified via Lighthouse/Axe).
- [ ] **Cumulative Layout Shift (CLS):** Ensure CLS is `< 0.1` by utilizing fixed-dimension skeleton shimmers while data loads.
- [ ] **Lighthouse Performance Score:** Target score of **> 90** on desktop and mobile.
