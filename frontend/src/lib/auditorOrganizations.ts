import { Company } from "@/types/company.types";
import { companyService } from "@/services/company.service";
import { auditorMappingService } from "@/services/auditorMapping.service";
import { dashboardService } from "@/services/dashboard.service";
import { AuditorOrganizationItem } from "@/types/dashboard.types";

/** Dedupe organizations by MongoDB `_id`. */
export function dedupeCompaniesById(companies: Company[]): Company[] {
  const byId = new Map<string, Company>();
  for (const c of companies) {
    if (c?._id) byId.set(String(c._id), c);
  }
  return Array.from(byId.values());
}

function mapAuditorOrgItemToCompany(o: AuditorOrganizationItem): Company {
  return {
    _id: o._id,
    name: o.name,
    domain: o.domain || "",
    industry: o.industry,
    country: o.country,
    status: o.status || "Active",
    activePlan: o.activePlan,
    verificationStatus: "Pending",
  };
}

/**
 * Loads organizations an Assessor may access (BE-M2-01 workaround):
 * merges dashboard auditor orgs, auditor mappings, and GET /companies.
 */
export async function fetchAssessorAccessibleCompanies(auditorId: string): Promise<Company[]> {
  const collected: Company[] = [];

  try {
    const orgsRes = await dashboardService.getAuditorOrganizations();
    const list = orgsRes?.data?.organizations;
    if (Array.isArray(list)) {
      collected.push(...list.map(mapAuditorOrgItemToCompany));
    }
  } catch {
    /* fallback to mappings / companies */
  }

  try {
    const mappingsRes = await auditorMappingService.getMappingsByAuditor(auditorId);
    const payload = mappingsRes?.data as
      | { organizations?: Array<{ organization?: Company; organizationId?: Company }> }
      | undefined;
    const orgList = payload?.organizations ?? [];
    for (const m of orgList) {
      const org = m.organization ?? m.organizationId;
      if (org && typeof org === "object" && (org as Company)._id) {
        collected.push(org as Company);
      }
    }
  } catch {
    /* continue */
  }

  try {
    const directRes = await companyService.getCompanies({ limit: 100 });
    if (Array.isArray(directRes?.data)) {
      collected.push(...directRes.data);
    }
  } catch {
    /* continue */
  }

  return dedupeCompaniesById(collected);
}

export interface OrganizationListFilters {
  search?: string;
  status?: string;
  verificationStatus?: string;
  tier?: string;
}

/** Client-side filters for merged assessor org lists (and admin lists when needed). */
export function applyOrganizationListFilters(
  companies: Company[],
  filters: OrganizationListFilters
): Company[] {
  let result = [...companies];

  const q = filters.search?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.domain || "").toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((c) => c.status === filters.status);
  }

  if (filters.verificationStatus && filters.verificationStatus !== "all") {
    result = result.filter((c) => c.verificationStatus === filters.verificationStatus);
  }

  if (filters.tier && filters.tier !== "all") {
    result = result.filter((c) => (c.activePlan || "") === filters.tier);
  }

  return result;
}
