export type ApiErrorCode =
  | 'INTERNAL_SERVER_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

export type ApiFieldErrors = Record<string, string[]>;

export type ApiError = {
  code: ApiErrorCode | string;
  message: string;
  fieldErrors?: ApiFieldErrors;
};

export type ApiResponseMeta = {
  requestId?: string;
};

export type PaginationMeta = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: ApiResponseMeta;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiError;
  meta?: ApiResponseMeta;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedData<T> = {
  items: T[];
};

export type PaginatedResponse<T> = ApiSuccessResponse<PaginatedData<T>> & {
  meta: ApiResponseMeta & {
    pagination: PaginationMeta;
  };
};
