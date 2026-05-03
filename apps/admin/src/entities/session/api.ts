import { apiGet, apiPost } from '@/shared/api/api-client';
import type { LoginRequest, LogoutResult, Session } from './types';

export function login(request: LoginRequest): Promise<Session> {
  return apiPost<Session, LoginRequest>('/auth/login', request);
}

export function getCurrentSession(): Promise<Session> {
  return apiGet<Session>('/auth/me');
}

export function logout(): Promise<LogoutResult> {
  return apiPost<LogoutResult>('/auth/logout');
}
