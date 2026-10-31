import { apiClient } from "./apiClient";
import {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  VerificationStatus,
  CompanyStatus,
  CompanyTrendsResponse,
} from "@/types/company.types";

export const companyService = {
  getCompanies: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    verificationStatus?: string;
  }) =>
    apiClient.get<Company[]>("/companies", { params }),

  getCompanyById: (id: string) =>
    apiClient.get<Company>(`/companies/${id}`),

  createCompany: (payload: CreateCompanyPayload) =>
    apiClient.post<{ company: Company; user?: any; verification: any }>("/companies", payload),

  updateCompany: (id: string, payload: UpdateCompanyPayload) =>
    apiClient.patch<Company>(`/companies/${id}`, payload),

  updateCompanyStatus: (id: string, payload: { status: CompanyStatus; reason?: string } | CompanyStatus) => {
    const body = typeof payload === "string" ? { status: payload } : payload;
    return apiClient.patch<{ message: string; company: Company }>(`/companies/${id}/status`, body);
  },

  verifyCompanyDns: (
    id: string,
    payload: { verificationStatus: VerificationStatus; notes?: string } | VerificationStatus
  ) => {
    const body =
      typeof payload === "string"
        ? { verificationStatus: payload }
        : payload;
    return apiClient.post<{ message: string; company: Company }>(`/companies/${id}/verify`, body);
  },

  getCompanyTrends: (id: string) =>
    apiClient.get<CompanyTrendsResponse>(`/companies/${id}/trends`),
};
