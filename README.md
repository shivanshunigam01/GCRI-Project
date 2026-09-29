# GRAICE Assessment Platform

Built with **Next.js 15 (App Router)**, **TypeScript**, and **MongoDB**.

## Overview
The GRAICE Assessment Platform digitizes the GCRAI/GRAICE Responsible AI governance assessment methodology, replacing manual Excel workbook and Word-based questionnaire processes with a secure, persistent, database-backed application.

## Key Features
- **7 GRAICE Pillars**: Full evaluation engine across Governance, Risk, Accountability, Integrity, Compliance, Ethics & Safety.
- **Light & Full Assessments**: Flexible evaluation paths for rapid triage or comprehensive audits.
- **Automated Maturity Scoring**: Deterministic scoring and level classification (Initial, Emerging, Established, Advanced).
- **Role-Based Access Control (RBAC)**: Enforced boundaries across Admin, Assessor, and upcoming Membership Approver roles.
- **Multi-Factor Authentication (MFA)**: TOTP-based verification with recovery keys.
- **Verification Engine**: Automated domain and company data validation.

## Getting Started

### 1. Environment Setup
Copy the example environment file and populate your connection credentials:
```bash
cp .env.example .env.local
```

### 2. Development Server
Run the local Next.js dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. API Health Check
Test the API endpoint:
```bash
curl http://localhost:3000/api/v1/health
```
