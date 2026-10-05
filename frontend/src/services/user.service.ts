import { apiClient } from "@/services/apiClient";
import {
  UserItem,
  UserFilterParams,
  UserListResponseData,
  UserInvitePayload,
  UserInviteResponseData,
  AcceptInvitePayload,
  UpdateProfilePayload,
} from "@/types/user.types";
import { UserRole, UserStatus } from "@/types/auth.types";
import { ApiResponse } from "@/types/api.types";

export const userService = {
  getMe: async (): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>("/users/me");
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getUsers: async (params?: UserFilterParams): Promise<ApiResponse<UserListResponseData>> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.role) query.append("role", params.role);
    if (params?.status) query.append("status", params.status);
    if (params?.companyId) query.append("companyId", params.companyId);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await apiClient<any>(`/users${queryString}`);

    if (res.success && res.data) {
      const userList: UserItem[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.users)
        ? res.data.users
        : [];

      const totalCount =
        res.pagination?.total ??
        (Array.isArray(res.data) ? res.data.length : res.data.total ?? userList.length);

      return {
        ...res,
        data: {
          users: userList,
          total: totalCount,
          page: res.pagination?.page ?? 1,
          totalPages: res.pagination?.totalPages ?? 1,
        },
      };
    }

    return res;
  },

  getUserById: async (id: string): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>(`/users/${id}`);
  },

  inviteUser: async (payload: UserInvitePayload): Promise<ApiResponse<UserInviteResponseData>> => {
    return apiClient<UserInviteResponseData>("/users/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  acceptInvite: async (payload: AcceptInvitePayload): Promise<ApiResponse<{ message: string }>> => {
    return apiClient<{ message: string }>("/users/accept-invite", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (id: string, status: UserStatus): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateRole: async (id: string, role: UserRole): Promise<ApiResponse<UserItem>> => {
    return apiClient<UserItem>(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
};
