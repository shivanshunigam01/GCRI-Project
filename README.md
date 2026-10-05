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

## Project Structure
- `backend/`: Standalone Express + TypeScript + MongoDB API service (Port 5000)
- `frontend/`: Next.js (App Router) + TypeScript user interface (Port 3000)

## Getting Started

### 1. Backend Service
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Backend API will run at `http://localhost:5000`. Health check: `http://localhost:5000/api/v1/health`

### 2. Frontend Application
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Frontend will run at `http://localhost:3000`.

