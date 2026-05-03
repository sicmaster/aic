import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMenu,
  deleteMenu,
  getGroup,
  getMenu,
  listGroups,
  listMenus,
  listPolicies,
  updateGroupPolicies,
  updateMenu,
  updateMenuSortOrder,
} from './api';
import type {
  CreateMenuRequest,
  UpdateGroupPoliciesRequest,
  UpdateMenuRequest,
  UpdateMenuSortOrderRequest,
} from './types';

export const groupsQueryKey = ['access-control', 'groups'] as const;
export const groupQueryKey = (code: string) => ['access-control', 'groups', code] as const;
export const policiesQueryKey = ['access-control', 'policies'] as const;
export const menusQueryKey = ['access-control', 'menus'] as const;
export const menuQueryKey = (code: string) => ['access-control', 'menus', code] as const;

export function useGroupsQuery() {
  return useQuery({
    queryKey: groupsQueryKey,
    queryFn: listGroups,
  });
}

export function useGroupQuery(code: string) {
  return useQuery({
    queryKey: groupQueryKey(code),
    queryFn: () => getGroup(code),
  });
}

export function usePoliciesQuery() {
  return useQuery({
    queryKey: policiesQueryKey,
    queryFn: listPolicies,
    staleTime: 5 * 60_000,
  });
}

export function useMenusQuery() {
  return useQuery({
    queryKey: menusQueryKey,
    queryFn: listMenus,
  });
}

export function useMenuQuery(code: string) {
  return useQuery({
    queryKey: menuQueryKey(code),
    queryFn: () => getMenu(code),
  });
}

export function useUpdateGroupPoliciesMutation(code: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateGroupPoliciesRequest) => updateGroupPolicies(code, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(groupQueryKey(code), response);
      await queryClient.invalidateQueries({ queryKey: groupsQueryKey });
    },
  });
}

export function useCreateMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateMenuRequest) => createMenu(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menusQueryKey });
    },
  });
}

export function useUpdateMenuMutation(code: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateMenuRequest) => updateMenu(code, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(menuQueryKey(code), response);
      await queryClient.invalidateQueries({ queryKey: menusQueryKey });
    },
  });
}

export function useDeleteMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => deleteMenu(code),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menusQueryKey });
    },
  });
}

export function useUpdateMenuSortOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateMenuSortOrderRequest) => updateMenuSortOrder(request),
    onSuccess: async (response) => {
      queryClient.setQueryData(menusQueryKey, response);
      await queryClient.invalidateQueries({ queryKey: menusQueryKey });
    },
  });
}
