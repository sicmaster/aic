import type { ApiErrorResponse, ApiResponse } from '@aic/types';
import { env } from '@/shared/config/env';

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(status: number, response: ApiErrorResponse) {
    super(response.error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = response.error.code;
    this.fieldErrors = response.error.fieldErrors;
  }
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: 'GET',
  });
}

export async function apiPost<T, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function apiPatch<T, TBody = unknown>(
  path: string,
  body?: TBody,
  init?: RequestInit,
): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function apiDelete<T>(path: string, init?: RequestInit): Promise<T> {
  return apiRequest<T>(path, {
    ...init,
    method: 'DELETE',
  });
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
      ...init,
      signal: init.signal ?? abortController.signal,
    });
    const body = (await readJson(response)) as ApiResponse<T>;

    if (!response.ok || !body.success) {
      throw new ApiClientError(response.status, normalizeError(response.status, body));
    }

    return body.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return {
      success: true,
      data: undefined,
    };
  }

  return JSON.parse(text);
}

function buildApiUrl(path: string): string {
  const normalizedBase = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

function normalizeError<T>(status: number, body: ApiResponse<T>): ApiErrorResponse {
  if (!body.success) {
    return body;
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_API_ERROR',
      message: `Unexpected API response with status ${status}.`,
    },
  };
}
