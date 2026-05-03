import { ApiClientError } from '@/shared/api/api-client';

export type SessionState = 'loading' | 'authenticated' | 'anonymous';

export function getSessionState(isLoading: boolean, data: unknown, error: unknown): SessionState {
  if (isLoading) {
    return 'loading';
  }

  if (data) {
    return 'authenticated';
  }

  if (isUnauthorizedError(error)) {
    return 'anonymous';
  }

  return error ? 'anonymous' : 'loading';
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

export function buildLoginPath(nextPath?: string): string {
  if (!nextPath || nextPath === '/') {
    return '/login';
  }

  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function resolvePostLoginPath(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/';
  }

  if (nextPath === '/login' || nextPath.startsWith('/login?')) {
    return '/';
  }

  return nextPath;
}
