export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SyncPullResponse {
  changes: {
    [table: string]: {
      created: Record<string, unknown>[];
      updated: Record<string, unknown>[];
      deleted: string[];
    };
  };
  timestamp: number;
}

export interface SyncPushRequest {
  changes: {
    [table: string]: {
      created: Record<string, unknown>[];
      updated: Record<string, unknown>[];
      deleted: string[];
    };
  };
  last_pulled_at: number;
}
