export type TenantStatus = "Pending" | "Active" | "Suspended" | "Retired";

export type TenantMemberRole = "TenantAdmin" | "Auditor" | "SuperAdmin";

export interface TenantUserRef {
  _id: string;
  name: string;
  email: string;
  status?: string;
}

export interface TenantRecord {
  _id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdBy?: TenantUserRef | string;
  firstTenantAdminId?: TenantUserRef | string;
  createdAt?: string;
  updatedAt?: string;
  metadata?: {
    auditorCount: number;
    clientOrgCount: number;
    assessmentCount: number;
  };
}

export interface TenantMembershipItem {
  tenant: TenantRecord;
  role: TenantMemberRole;
  membershipStatus: string;
  joinedAt?: string;
}

export interface MyTenantsResponse {
  activeTenantId: string | null;
  tenants: TenantMembershipItem[];
}

export interface CreateTenantPayload {
  name: string;
  slug?: string;
  tenantAdmin?: {
    name: string;
    email: string;
  };
}

export interface AssignTenantAdminPayload {
  name: string;
  email: string;
}

export interface UpdateTenantStatusPayload {
  status: "Active" | "Suspended" | "Retired";
  reason?: string;
}

export interface CreateTenantResponse {
  message: string;
  tenant: TenantRecord;
  tenantAdmin?: {
    id: string;
    name: string;
    email: string;
    role: string;
    invitationExpires: string;
    invitationToken: string;
  } | null;
}