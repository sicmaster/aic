import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/api/api-client';
import type {
  CreateUserRequest,
  CreateUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  ListUsersParams,
  ListUsersResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UserGroupSummary,
} from './types';

export function listUsers(params: ListUsersParams): Promise<ListUsersResponse> {
  return apiGet<ListUsersResponse>(`/users${buildQueryString(params)}`);
}

export function getUserGroupOptions(): Promise<UserGroupSummary[]> {
  return apiGet<UserGroupSummary[]>('/users/group-options');
}

export function getUser(id: string): Promise<GetUserResponse> {
  return apiGet<GetUserResponse>(`/users/${id}`);
}

export function createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
  return apiPost<CreateUserResponse, CreateUserRequest>('/users', request);
}

export function updateUser(id: string, request: UpdateUserRequest): Promise<UpdateUserResponse> {
  return apiPatch<UpdateUserResponse, UpdateUserRequest>(`/users/${id}`, request);
}

export function deleteUser(id: string): Promise<DeleteUserResponse> {
  return apiDelete<DeleteUserResponse>(`/users/${id}`);
}

function buildQueryString(params: ListUsersParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}
