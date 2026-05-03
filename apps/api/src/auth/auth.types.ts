import type { Menu } from '../database/schema';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'inactive' | 'locked';
  lastLoginAt: string | null;
};

export type AuthGroup = {
  code: string;
  name: string;
};

export type AuthMenu = {
  id: string;
  code: string;
  label: string;
  path: string | null;
  icon: string | null;
  level: number;
  sortOrder: number;
  children: AuthMenu[];
};

export type AuthSessionPayload = {
  user: AuthUser;
  groups: AuthGroup[];
  permissions: string[];
  menus: AuthMenu[];
  expiresAt: string;
};

export type LoginResult = AuthSessionPayload & {
  sessionToken: string;
  ttlSeconds: number;
};

export type SessionContext = {
  ipAddress: string | undefined;
  userAgent: string | undefined;
};

export type MenuRow = Pick<
  Menu,
  'id' | 'parentId' | 'code' | 'label' | 'path' | 'icon' | 'level' | 'sortOrder'
>;
