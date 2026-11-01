import { storage } from "@/lib/storage";
import { beginApiRequest, endApiRequest } from "@/lib/apiLoadingStore";
import { ApiResponse } from "@/types/api.types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  beginApiRequest();
  const { params, headers, body: rawBody, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = storage.getToken();
  const isFormData =
    typeof FormData !== "undefined" && rawBody instanceof FormData;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };
  if (!isFormData) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...customConfig,
      body: isFormData
        ? rawBody
        : rawBody !== undefined && rawBody !== null
          ? typeof rawBody === "string"
            ? rawBody
            : JSON.stringify(rawBody)
          : undefined,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    if (response.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/login") && !currentPath.startsWith("/accept-invite")) {
        storage.clear();
      }
    }

    let data: any;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let errorMessage =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        `HTTP error ${response.status}`;

      if (data?.error?.details) {
        if (Array.isArray(data.error.details)) {
          const issues = data.error.details
            .map((d: any) => d.message || (d.path ? `${d.path.join(".")}: invalid` : null))
            .filter(Boolean)
            .join(". ");
          if (issues) {
            errorMessage = `${errorMessage}: ${issues}`;
          }
        } else if (typeof data.error.details === "string") {
          errorMessage = `${errorMessage}: ${data.error.details}`;
        }
      }

      const error = new Error(errorMessage) as any;
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as ApiResponse<T>;
  } finally {
    endApiRequest();
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),
  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body,
    }),
  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body,
    }),
  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body,
    }),
  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
