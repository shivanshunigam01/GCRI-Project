import { User } from "./auth.types";
import { Company } from "./company.types";

export interface AuditorOrganizationMapping {
  _id: string;
  auditorId: string | User;
  organizationId: string | Company;
  status: "Active" | "Inactive";
  assignedBy?: string | { _id?: string; name?: string; email?: string };
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrgAuditorItem {
  mappingId: string;
  auditor: User;
  assignedBy?: { _id: string; name: string; email: string };
  assignedAt?: string;
}

export interface OrgAuditorsResponse {
  organizationId: string;
  totalAuditors: number;
  auditors: OrgAuditorItem[];
}

export interface CreateAuditorMappingPayload {
  auditorId: string;
  organizationId: string;
}

