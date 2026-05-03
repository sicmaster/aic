import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, getUser, getUserGroupOptions, listUsers, updateUser } from './api';
import type { CreateUserRequest, ListUsersParams, UpdateUserRequest } from './types';

export const usersQueryKey = (params: ListUsersParams) => ['users', 'list', params] as const;
export const userQueryKey = (id: string) => ['users', 'detail', id] as const;
export const userGroupOptionsQueryKey = ['users', 'group-options'] as const;

export function useUsersQuery(params: ListUsersParams) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => listUsers(params),
  });
}

export function useUserGroupOptionsQuery() {
  return useQuery({
    queryKey: userGroupOptionsQueryKey,
    queryFn: getUserGroupOptions,
    staleTime: 5 * 60_000,
  });
}

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: () => getUser(id),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

export function useUpdateUserMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateUserRequest) => updateUser(id, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(userQueryKey(id), response);
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}
