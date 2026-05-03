export type UserStatus = 'active' | 'inactive' | 'locked';

export type UserGroupSummary = {
  code: string;
  name: string;
};

export type UserListItem = {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  groups: UserGroupSummary[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UsersPagination = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ListUsersResult = {
  items: UserListItem[];
  pagination: UsersPagination;
};

export type CreateUserResult = {
  user: UserListItem;
};

export type GetUserResult = {
  user: UserListItem;
};

export type UpdateUserResult = {
  user: UserListItem;
};

export type DeleteUserResult = {
  deleted: true;
};
