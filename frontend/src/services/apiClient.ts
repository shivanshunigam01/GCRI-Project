import { ApiResponse } from "@/types/api.types";
import { storage } from "@/lib/storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = storage.getToken();

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        ...defaultHeaders,
        ...(headers as Record<string, string>),
      },
      ...customConfig,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok && !data.error) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || "An unexpected network error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }

    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to backend server";
    return {
      success: false,
      error: {
        code: "CONNECTION_FAILED",
        message,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
