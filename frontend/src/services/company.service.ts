import { apiClient } from "./apiClient";
import { Company, CreateCompanyPayload } from "@/types/company.types";

export const companyService = {
  getCompanies: (params?: { page?: number; limit?: number; search?: string; status?: string; tier?: string }) =>
    apiClient.get<Company[]>("/companies", { params }),

  getCompanyById: (id: string) =>
    apiClient.get<Company>(`/companies/${id}`),

  createCompany: (payload: CreateCompanyPayload) =>
    apiClient.post<Company>("/companies", payload),

  updateCompany: (id: string, payload: Partial<CreateCompanyPayload>) =>
    apiClient.patch<Company>(`/companies/${id}`, payload),

  updateCompanyStatus: (id: string, status: "Active" | "Suspended") =>
    apiClient.patch(`/companies/${id}/status`, { status }),

  verifyCompanyDns: (id: string, status: "Verified" | "Pending" | "Rejected") =>
    apiClient.post(`/companies/${id}/verify`, { status }),

  getCompanyTrends: (id: string) =>
    apiClient.get(`/companies/${id}/trends`),
};
