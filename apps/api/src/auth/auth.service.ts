import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { and, asc, eq, gt, isNull } from 'drizzle-orm';
import { ApiErrorCode } from '../common/errors/api-error-code';
import { AppException } from '../common/errors/app.exception';
import { DATABASE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  groupMembers,
  groupPolicies,
  groups,
  menus,
  permissions,
  policies,
  policyMenus,
  policyPermissions,
  userSessions,
  users,
  type User,
} from '../database/schema';
import type {
  AuthGroup,
  AuthMenu,
  AuthSessionPayload,
  LoginResult,
  MenuRow,
  SessionContext,
} from './auth.types';
import type { LoginDto } from './dto/login.dto';

const DAY_IN_SECONDS = 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly configService: ConfigService,
  ) {}

  getSessionCookieName(): string {
    return this.configService.get<string>('AUTH_SESSION_COOKIE_NAME', 'aic_session');
  }

  async login(dto: LoginDto, context: SessionContext): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw this.invalidCredentials();
    }

    this.assertUserCanAttemptLogin(user);

    const passwordValid = await this.verifyPassword(user.passwordHash, dto.password);

    if (!passwordValid) {
      await this.registerFailedLogin(user);
      throw this.invalidCredentials();
    }

    const now = new Date();
    const ttlSeconds = this.configService.get<number>('AUTH_SESSION_TTL_DAYS', 7) * DAY_IN_SECONDS;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const sessionToken = this.createSessionToken();

    await this.database.insert(userSessions).values({
      userId: user.id,
      sessionTokenHash: this.hashSessionToken(sessionToken),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt,
      lastSeenAt: now,
    });

    await this.database
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        status: 'active',
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    const payload = await this.buildSessionPayload(user.id, expiresAt);

    return {
      ...payload,
      sessionToken,
      ttlSeconds,
    };
  }

  async getCurrentSession(sessionToken: string | undefined): Promise<AuthSessionPayload> {
    if (!sessionToken) {
      throw this.unauthorized();
    }

    const now = new Date();
    const session = await this.database.query.userSessions.findFirst({
      where: and(
        eq(userSessions.sessionTokenHash, this.hashSessionToken(sessionToken)),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, now),
      ),
    });

    if (!session) {
      throw this.unauthorized();
    }

    const user = await this.database.query.users.findFirst({
      where: and(eq(users.id, session.userId), isNull(users.deletedAt)),
    });

    if (!user || user.status !== 'active') {
      throw this.unauthorized();
    }

    await this.database
      .update(userSessions)
      .set({ lastSeenAt: now })
      .where(eq(userSessions.id, session.id));

    return this.buildSessionPayload(user.id, session.expiresAt);
  }

  async logout(sessionToken: string | undefined): Promise<{ loggedOut: true }> {
    if (sessionToken) {
      await this.database
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.sessionTokenHash, this.hashSessionToken(sessionToken)));
    }

    return { loggedOut: true };
  }

  private async findUserByEmail(email: string): Promise<User | undefined> {
    return this.database.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
  }

  private assertUserCanAttemptLogin(user: User): void {
    const now = new Date();

    if (user.status === 'active') {
      return;
    }

    if (user.status === 'locked' && user.lockedUntil && user.lockedUntil <= now) {
      return;
    }

    if (user.status === 'locked') {
      throw new AppException(
        {
          code: 'AUTH_ACCOUNT_LOCKED',
          message: 'Account is temporarily locked. Please try again later.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    throw this.invalidCredentials();
  }

  private async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  private async registerFailedLogin(user: User): Promise<void> {
    const now = new Date();
    const maxAttempts = this.configService.get<number>('AUTH_LOCK_MAX_ATTEMPTS', 5);
    const lockMinutes = this.configService.get<number>('AUTH_LOCK_MINUTES', 15);
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const shouldLock = failedLoginAttempts >= maxAttempts;

    await this.database
      .update(users)
      .set({
        failedLoginAttempts,
        lockedUntil: shouldLock ? new Date(now.getTime() + lockMinutes * 60 * 1000) : null,
        status: shouldLock ? 'locked' : user.status,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));
  }

  private async buildSessionPayload(userId: string, expiresAt: Date): Promise<AuthSessionPayload> {
    const user = await this.database.query.users.findFirst({
      columns: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        lastLoginAt: true,
      },
      where: eq(users.id, userId),
    });

    if (!user) {
      throw this.unauthorized();
    }

    const [userGroups, permissionCodes, menuRows] = await Promise.all([
      this.getGroups(userId),
      this.getPermissions(userId),
      this.getMenus(userId),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      groups: userGroups,
      permissions: permissionCodes,
      menus: buildMenuTree(menuRows),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async getGroups(userId: string): Promise<AuthGroup[]> {
    const rows = await this.database
      .select({
        code: groups.code,
        name: groups.name,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(
        and(eq(groupMembers.userId, userId), eq(groups.isActive, true), isNull(groups.deletedAt)),
      )
      .orderBy(asc(groups.name));

    return rows;
  }

  private async getPermissions(userId: string): Promise<string[]> {
    const rows = await this.database
      .select({
        code: permissions.code,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .innerJoin(groupPolicies, eq(groupMembers.groupId, groupPolicies.groupId))
      .innerJoin(policies, eq(groupPolicies.policyId, policies.id))
      .innerJoin(policyPermissions, eq(policies.id, policyPermissions.policyId))
      .innerJoin(permissions, eq(policyPermissions.permissionId, permissions.id))
      .where(
        and(
          eq(groupMembers.userId, userId),
          eq(groups.isActive, true),
          isNull(groups.deletedAt),
          eq(policies.isActive, true),
          isNull(policies.deletedAt),
        ),
      )
      .orderBy(asc(permissions.code));

    return [...new Set(rows.map((row) => row.code))];
  }

  private async getMenus(userId: string): Promise<MenuRow[]> {
    const rows = await this.database
      .select({
        id: menus.id,
        parentId: menus.parentId,
        code: menus.code,
        label: menus.label,
        path: menus.path,
        icon: menus.icon,
        level: menus.level,
        sortOrder: menus.sortOrder,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .innerJoin(groupPolicies, eq(groupMembers.groupId, groupPolicies.groupId))
      .innerJoin(policies, eq(groupPolicies.policyId, policies.id))
      .innerJoin(policyMenus, eq(policies.id, policyMenus.policyId))
      .innerJoin(menus, eq(policyMenus.menuId, menus.id))
      .where(
        and(
          eq(groupMembers.userId, userId),
          eq(groups.isActive, true),
          isNull(groups.deletedAt),
          eq(policies.isActive, true),
          isNull(policies.deletedAt),
          eq(menus.isActive, true),
          isNull(menus.deletedAt),
        ),
      )
      .orderBy(asc(menus.level), asc(menus.sortOrder), asc(menus.label));

    return uniqueMenus(rows);
  }

  private createSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashSessionToken(sessionToken: string): string {
    return createHash('sha256').update(sessionToken).digest('hex');
  }

  private invalidCredentials(): AppException {
    return new AppException(
      {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Invalid email or password.',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  private unauthorized(): AppException {
    return new AppException(
      {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication is required.',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

function uniqueMenus(rows: MenuRow[]): MenuRow[] {
  const seen = new Set<string>();
  const result: MenuRow[] = [];

  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }

    seen.add(row.id);
    result.push(row);
  }

  return result;
}

function buildMenuTree(rows: MenuRow[]): AuthMenu[] {
  const nodes = new Map<string, AuthMenu>();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      code: row.code,
      label: row.label,
      path: row.path,
      icon: row.icon,
      level: row.level,
      sortOrder: row.sortOrder,
      children: [],
    });
  }

  const roots: AuthMenu[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id);

    if (!node) {
      continue;
    }

    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)?.children.push(node);
      continue;
    }

    roots.push(node);
  }

  return sortMenus(roots);
}

function sortMenus(menusToSort: AuthMenu[]): AuthMenu[] {
  return menusToSort
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((menu) => ({
      ...menu,
      children: sortMenus(menu.children),
    }));
}
