import type { Company, ClientUserSummary, CompanyPrimaryContact } from "@/types/company.types";

export function resolveCompanyContact(company: {
  primaryContact?: CompanyPrimaryContact | null;
  clientUser?: ClientUserSummary | null;
}): { name?: string; email?: string; phone?: string } {
  const p = company.primaryContact;
  const u = company.clientUser;
  return {
    name: p?.name || u?.name,
    email: p?.email || u?.email,
    phone: p?.phone || u?.phone,
  };
}

export function formatOrgSubtitle(company: Pick<Company, "industry" | "country">): string {
  const parts = [company.industry?.trim(), company.country?.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}
