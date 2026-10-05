export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: ApiPagination;
  timestamp: string;
}
