import { AssessmentSession } from "@/types/assessment.types";

export function organizationNameFromSession(session: AssessmentSession): string {
  const c = session.companyId;
  if (c && typeof c === "object" && "name" in c) {
    return String((c as { name?: string }).name || "Organization");
  }
  return "Organization";
}

export function auditorNameFromSession(session: AssessmentSession): string {
  const u = session.conductedByUserId;
  if (u && typeof u === "object" && "name" in u) {
    return String((u as { name?: string }).name || "Assessor");
  }
  return "Assessor";
}

export function auditorEmailFromSession(session: AssessmentSession): string | undefined {
  const u = session.conductedByUserId;
  if (u && typeof u === "object" && "email" in u) {
    return (u as { email?: string }).email;
  }
  return undefined;
}

export function formatMaturityLabel(level: string): string {
  return level;
}
