import { apiClient } from "@/services/apiClient";
import { Company, CompanyCreatePayload, CompanyCreateResponseData } from "@/types/company.types";
import { ApiResponse } from "@/types/api.types";

export const companyService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    verificationStatus?: string;
    status?: string;
  }): Promise<
    ApiResponse<{ companies: Company[]; total: number; page: number; totalPages: number }>
  > => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.verificationStatus) query.append("verificationStatus", params.verificationStatus);
    if (params?.status) query.append("status", params.status);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await apiClient<any>(`/companies${queryString}`);

    if (res.success && res.data) {
      const companiesList: Company[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.companies)
        ? res.data.companies
        : [];

      const totalCount =
        res.pagination?.total ??
        (Array.isArray(res.data) ? res.data.length : res.data.total ?? companiesList.length);

      return {
        ...res,
        data: {
          companies: companiesList,
          total: totalCount,
          page: res.pagination?.page ?? 1,
          totalPages: res.pagination?.totalPages ?? 1,
        },
      };
    }

    return res;
  },

  getById: async (id: string): Promise<ApiResponse<Company>> => {
    return apiClient<Company>(`/companies/${id}`);
  },

  create: async (payload: CompanyCreatePayload): Promise<ApiResponse<CompanyCreateResponseData>> => {
    return apiClient<CompanyCreateResponseData>("/companies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verify: async (
    id: string,
    payload: { verificationStatus: "Verified" | "Pending" | "Rejected"; notes?: string }
  ): Promise<ApiResponse<Company>> => {
    return apiClient<Company>(`/companies/${id}/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verifyDns: async (id: string): Promise<ApiResponse<Company>> => {
    return apiClient<Company>(`/companies/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({ verificationStatus: "Verified", notes: "Manual DNS verification override" }),
    });
  },

  updateStatus: async (
    id: string,
    payload: { status: "Active" | "Suspended"; reason?: string }
  ): Promise<ApiResponse<Company>> => {
    return apiClient<Company>(`/companies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  update: async (
    id: string,
    payload: Partial<{ name: string; registrationNumber: string; country: string; industry: string }>
  ): Promise<ApiResponse<Company>> => {
    return apiClient<Company>(`/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
