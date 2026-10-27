export const GRAICE_PILLARS = [
  { id: "P1", code: "P1", name: "Governance & Oversight", description: "AI policies, executive responsibility, and organizational compliance structures." },
  { id: "P2", code: "P2", name: "Risk & Impact Assessment", description: "AI classification, risk management workflows, and downstream societal impact." },
  { id: "P3", code: "P3", name: "Accountability & Auditing", description: "Traceability, logging, verification, and external validation standards." },
  { id: "P4", code: "P4", name: "Integrity & Data Quality", description: "Data lineage, bias mitigation, input validation, and model validation." },
  { id: "P5", code: "P5", name: "Cybersecurity & Resilience", description: "Adversarial robustness, prompt injection defense, and incident response." },
  { id: "P6", code: "P6", name: "Explainability & Transparency", description: "Model interpretability, end-user disclosures, and auditability." },
  { id: "P7", code: "P7", name: "Human Agency & Oversight", description: "Human-in-the-loop safeguards, fail-safes, and override capabilities." },
] as const;

export const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  ASSESSOR: "Assessor",
  MEMBERSHIP_APPROVER: "MembershipApprover",
} as const;

export const SUBSCRIPTION_TIERS = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
} as const;

export const ASSESSMENT_TYPES = {
  LIGHT: "Light",
  FULL: "Full",
} as const;

export const ASSESSMENT_STATUSES = {
  DRAFT: "Draft",
  IN_PROGRESS: "InProgress",
  SUBMITTED: "Submitted",
  COMPLETED: "Completed",
} as const;

export const COMPANY_STATUSES = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
} as const;

export const VERIFICATION_STATUSES = {
  VERIFIED: "Verified",
  PENDING: "Pending",
  REJECTED: "Rejected",
} as const;
