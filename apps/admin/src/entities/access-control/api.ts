import { apiDelete, apiGet, apiPatch, apiPost } from '@/shared/api/api-client';
import type {
  CreateMenuRequest,
  CreateMenuResponse,
  DeleteMenuResponse,
  GetGroupResponse,
  GetMenuResponse,
  ListGroupsResponse,
  ListMenusResponse,
  ListPoliciesResponse,
  UpdateMenuRequest,
  UpdateMenuResponse,
  UpdateMenuSortOrderRequest,
  UpdateMenuSortOrderResponse,
  UpdateGroupPoliciesRequest,
  UpdateGroupPoliciesResponse,
} from './types';

export function listGroups(): Promise<ListGroupsResponse> {
  return apiGet<ListGroupsResponse>('/access-control/groups');
}

export function getGroup(code: string): Promise<GetGroupResponse> {
  return apiGet<GetGroupResponse>(`/access-control/groups/${code}`);
}

export function listPolicies(): Promise<ListPoliciesResponse> {
  return apiGet<ListPoliciesResponse>('/access-control/policies');
}

export function listMenus(): Promise<ListMenusResponse> {
  return apiGet<ListMenusResponse>('/access-control/menus');
}

export function getMenu(code: string): Promise<GetMenuResponse> {
  return apiGet<GetMenuResponse>(`/access-control/menus/${code}`);
}

export function createMenu(request: CreateMenuRequest): Promise<CreateMenuResponse> {
  return apiPost<CreateMenuResponse, CreateMenuRequest>('/access-control/menus', request);
}

export function updateMenu(code: string, request: UpdateMenuRequest): Promise<UpdateMenuResponse> {
  return apiPatch<UpdateMenuResponse, UpdateMenuRequest>(`/access-control/menus/${code}`, request);
}

export function deleteMenu(code: string): Promise<DeleteMenuResponse> {
  return apiDelete<DeleteMenuResponse>(`/access-control/menus/${code}`);
}

export function updateMenuSortOrder(
  request: UpdateMenuSortOrderRequest,
): Promise<UpdateMenuSortOrderResponse> {
  return apiPatch<UpdateMenuSortOrderResponse, UpdateMenuSortOrderRequest>(
    '/access-control/menus/sort-order',
    request,
  );
}

export function updateGroupPolicies(
  code: string,
  request: UpdateGroupPoliciesRequest,
): Promise<UpdateGroupPoliciesResponse> {
  return apiPatch<UpdateGroupPoliciesResponse, UpdateGroupPoliciesRequest>(
    `/access-control/groups/${code}/policies`,
    request,
  );
}
