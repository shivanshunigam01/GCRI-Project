export const GRAICE_PILLARS = [
  { id: "P1", code: "P1", number: 1, name: "Ethical Leadership", description: "AI ethics governance, executive oversight, and charter compliance." },
  { id: "P2", code: "P2", number: 2, name: "Data Governance & Integrity", description: "Data provenance, bias mitigation, pipeline security, and data validation." },
  { id: "P3", code: "P3", number: 3, name: "Purpose-Driven Innovation", description: "Value alignment, environmental impact, and beneficial AI utility." },
  { id: "P4", code: "P4", number: 4, name: "Human-Centric Use", description: "Workplace augmentation, human oversight, feedback loops, and user dignity." },
  { id: "P5", code: "P5", number: 5, name: "Responsible Implementation", description: "System safety, guardrails, deployment monitoring, and fail-safes." },
  { id: "P6", code: "P6", number: 6, name: "AI Literacy & Workforce Readiness", description: "Employee upskilling, awareness training, and stakeholder education." },
  { id: "P7", code: "P7", number: 7, name: "Transparency & Auditability", description: "Model explainability, comprehensive audit logging, and external auditability." },
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
  IN_PROGRESS: "InProgress",
  SUBMITTED: "Submitted",
  ARCHIVED: "Archived",
} as const;

export const ANSWER_TEST_STATUSES = {
  NOT_STARTED: "NotStarted",
  IN_PROGRESS: "InProgress",
  COMPLETE: "Complete",
} as const;

export const ANSWER_EXCEPTION_STATUSES = {
  NO_EXCEPTION_NOTED: "NoExceptionNoted",
  EXCEPTION_NOTED: "ExceptionNoted",
  NOT_ASSESSED: "NotAssessed",
} as const;

export const MATURITY_LEVELS = {
  INITIAL: "Initial",
  EMERGING: "Emerging",
  ESTABLISHED: "Established",
  ADVANCED: "Advanced",
} as const;

export const FRAMEWORK_STATUSES = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
} as const;

export const MAPPING_STATUSES = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
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

export const AUDIT_LOG_ENTITIES = {
  COMPANY: "Company",
  USER: "User",
  ASSESSMENT_SESSION: "AssessmentSession",
  ASSESSMENT_FRAMEWORK: "AssessmentFramework",
  AUDITOR_ORGANIZATION: "AuditorOrganization",
  API_KEY: "ApiKey",
  WEBHOOK_SUBSCRIPTION: "WebhookSubscription",
} as const;
