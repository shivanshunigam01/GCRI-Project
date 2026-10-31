import { User } from "./auth.types";
import { Company } from "./company.types";

export type MappingStatus = "Active" | "Inactive";

export interface AuditorAssignedBy {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AuditorOrganizationMapping {
  _id: string;
  auditorId: string | User;
  organizationId: string | Company;
  assignedBy: string | AuditorAssignedBy;
  status: MappingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrgAuditorItem {
  mappingId: string;
  auditor: User;
  assignedBy?: AuditorAssignedBy;
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
