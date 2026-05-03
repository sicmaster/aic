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

export type ListUsersResponse = {
  items: UserListItem[];
  pagination: UsersPagination;
};

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  search?: string | undefined;
  status?: UserStatus | undefined;
};

export type CreateUserRequest = {
  email: string;
  fullName: string;
  password: string;
  groupCodes: string[];
};

export type CreateUserResponse = {
  user: UserListItem;
};

export type GetUserResponse = {
  user: UserListItem;
};

export type UpdateUserRequest = {
  fullName: string;
  status: UserStatus;
  groupCodes: string[];
};

export type UpdateUserResponse = {
  user: UserListItem;
};

export type DeleteUserResponse = {
  deleted: true;
};
