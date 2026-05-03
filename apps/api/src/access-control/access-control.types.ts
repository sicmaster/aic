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

export type ListAccessControlGroupsResult = {
  items: AccessControlGroup[];
};

export type GetAccessControlGroupResult = {
  group: AccessControlGroup;
};

export type ListAccessControlPoliciesResult = {
  items: AccessControlPolicy[];
};

export type ListAccessControlPermissionsResult = {
  items: AccessControlPermission[];
};

export type ListAccessControlMenusResult = {
  items: AccessControlMenu[];
};

export type GetAccessControlMenuResult = {
  menu: AccessControlMenu;
};

export type CreateAccessControlMenuResult = {
  menu: AccessControlMenu;
};

export type UpdateAccessControlMenuResult = {
  menu: AccessControlMenu;
};

export type DeleteAccessControlMenuResult = {
  deleted: true;
};

export type UpdateMenuSortOrderResult = {
  items: AccessControlMenu[];
};

export type UpdateGroupPoliciesResult = {
  group: AccessControlGroup;
};
