import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentSession, login, logout } from './api';
import type { LoginRequest } from './types';

export const sessionQueryKey = ['session', 'current'] as const;

export function useSessionQuery() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: getCurrentSession,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LoginRequest) => login(request),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}
