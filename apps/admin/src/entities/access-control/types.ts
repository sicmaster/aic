export type AccessControlPolicySummary = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
};

export type AccessControlGroup = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  policies: AccessControlPolicySummary[];
  createdAt: string;
  updatedAt: string;
};

export type AccessControlPermission = {
  code: string;
  resource: string;
  action: string;
  description: string | null;
};

export type AccessControlMenu = {
  id: string;
  code: string;
  label: string;
  path: string | null;
  icon: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  children: AccessControlMenu[];
};

export type AccessControlPolicy = AccessControlPolicySummary & {
  permissions: AccessControlPermission[];
  menus: AccessControlMenu[];
  createdAt: string;
  updatedAt: string;
};

export type ListGroupsResponse = {
  items: AccessControlGroup[];
};

export type GetGroupResponse = {
  group: AccessControlGroup;
};

export type ListPoliciesResponse = {
  items: AccessControlPolicy[];
};

export type ListMenusResponse = {
  items: AccessControlMenu[];
};

export type GetMenuResponse = {
  menu: AccessControlMenu;
};

export type CreateMenuRequest = {
  code: string;
  label: string;
  parentCode?: string | undefined;
  path?: string | undefined;
  icon?: string | undefined;
  level: number;
  sortOrder: number;
  isActive: boolean;
};

export type CreateMenuResponse = {
  menu: AccessControlMenu;
};

export type UpdateMenuRequest = Omit<CreateMenuRequest, 'code'>;

export type UpdateMenuResponse = {
  menu: AccessControlMenu;
};

export type DeleteMenuResponse = {
  deleted: true;
};

export type UpdateMenuSortOrderRequest = {
  items: Array<{
    code: string;
    sortOrder: number;
  }>;
};

export type UpdateMenuSortOrderResponse = {
  items: AccessControlMenu[];
};

export type UpdateGroupPoliciesRequest = {
  policyCodes: string[];
};

export type UpdateGroupPoliciesResponse = {
  group: AccessControlGroup;
};
