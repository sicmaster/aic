export type UserStatus = 'active' | 'inactive' | 'locked';

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  lastLoginAt: string | null;
};

export type SessionGroup = {
  code: string;
  name: string;
};

export type SessionMenu = {
  id: string;
  code: string;
  label: string;
  path: string | null;
  icon: string | null;
  level: number;
  sortOrder: number;
  children: SessionMenu[];
};

export type Session = {
  user: SessionUser;
  groups: SessionGroup[];
  permissions: string[];
  menus: SessionMenu[];
  expiresAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LogoutResult = {
  loggedOut: true;
};
