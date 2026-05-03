import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, asc, count, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import type { AuditContext } from '../audit/audit.types';
import { ApiErrorCode } from '../common/errors/api-error-code';
import { AppException } from '../common/errors/app.exception';
import { DATABASE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { groupMembers, groups, users } from '../database/schema';
import type { CreateUserDto } from './dto/create-user.dto';
import type { ListUsersDto } from './dto/list-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type {
  CreateUserResult,
  DeleteUserResult,
  GetUserResult,
  ListUsersResult,
  UpdateUserResult,
  UserGroupSummary,
  UserListItem,
} from './users.types';

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly auditService: AuditService,
  ) {}

  async listUsers(query: ListUsersDto): Promise<ListUsersResult> {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const where = buildUserWhere(query);

    const [totalRows, userRows] = await Promise.all([
      this.database.select({ value: count() }).from(users).where(where),
      this.database
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          status: users.status,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(where)
        .orderBy(asc(users.fullName), asc(users.email))
        .limit(pageSize)
        .offset(offset),
    ]);
    const total = Number(totalRows[0]?.value ?? 0);
    const groupsByUserId = await this.getGroupsByUserId(userRows.map((user) => user.id));

    return {
      items: userRows.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        groups: groupsByUserId.get(user.id) ?? [],
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async getGroupOptions(): Promise<UserGroupSummary[]> {
    const rows = await this.database
      .select({
        code: groups.code,
        name: groups.name,
      })
      .from(groups)
      .where(
        and(
          inArray(groups.code, ['admin', 'operator']),
          eq(groups.isActive, true),
          isNull(groups.deletedAt),
        ),
      )
      .orderBy(asc(groups.name));

    return rows;
  }

  async getUser(userId: string): Promise<GetUserResult> {
    return {
      user: await this.getUserListItem(userId),
    };
  }

  async createUser(
    dto: CreateUserDto,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<CreateUserResult> {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const groupCodes = [...new Set(dto.groupCodes)];
    const now = new Date();

    if (!fullName) {
      throw new AppException(
        {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Full name is required.',
          fieldErrors: { fullName: ['Full name is required.'] },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const createdUserId = await this.database.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        columns: { id: true },
        where: eq(users.email, email),
      });

      if (existingUser) {
        throw new AppException(
          {
            code: ApiErrorCode.CONFLICT,
            message: 'Email is already in use.',
          },
          HttpStatus.CONFLICT,
        );
      }

      const groupRows = await tx
        .select({
          id: groups.id,
          code: groups.code,
        })
        .from(groups)
        .where(
          and(
            inArray(groups.code, groupCodes),
            eq(groups.isActive, true),
            isNull(groups.deletedAt),
          ),
        );

      if (groupRows.length !== groupCodes.length) {
        throw new AppException(
          {
            code: ApiErrorCode.BAD_REQUEST,
            message: 'One or more groups are invalid.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const passwordHash = await argon2.hash(dto.password, PASSWORD_HASH_OPTIONS);
      const [createdUser] = await tx
        .insert(users)
        .values({
          email,
          fullName,
          passwordHash,
          status: 'active',
          failedLoginAttempts: 0,
          passwordChangedAt: now,
        })
        .returning({ id: users.id });

      if (!createdUser) {
        throw new AppException(
          {
            code: ApiErrorCode.INTERNAL_SERVER_ERROR,
            message: 'Unable to create user.',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      await tx.insert(groupMembers).values(
        groupRows.map((group) => ({
          groupId: group.id,
          userId: createdUser.id,
        })),
      );

      return createdUser.id;
    });

    const createdUser = await this.getUserListItem(createdUserId);
    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'users.create',
      entityType: 'user',
      entityId: createdUser.id,
      metadata: {
        email: createdUser.email,
        fullName: createdUser.fullName,
        groupCodes,
      },
    });

    return { user: createdUser };
  }

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<UpdateUserResult> {
    const fullName = dto.fullName.trim();
    const groupCodes = [...new Set(dto.groupCodes)];
    const now = new Date();
    let before: UserListItem | undefined;

    if (!fullName) {
      throw new AppException(
        {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Full name is required.',
          fieldErrors: { fullName: ['Full name is required.'] },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.database.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        columns: { id: true },
        where: and(eq(users.id, userId), isNull(users.deletedAt)),
      });

      if (!existingUser) {
        throw new AppException(
          {
            code: ApiErrorCode.NOT_FOUND,
            message: 'User not found.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      before = await this.getUserListItem(userId);

      const groupRows = await tx
        .select({
          id: groups.id,
          code: groups.code,
        })
        .from(groups)
        .where(
          and(
            inArray(groups.code, groupCodes),
            eq(groups.isActive, true),
            isNull(groups.deletedAt),
          ),
        );

      if (groupRows.length !== groupCodes.length) {
        throw new AppException(
          {
            code: ApiErrorCode.BAD_REQUEST,
            message: 'One or more groups are invalid.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx
        .update(users)
        .set({
          fullName,
          status: dto.status,
          lockedUntil: dto.status === 'locked' ? undefined : null,
          failedLoginAttempts: dto.status === 'locked' ? undefined : 0,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));
      await tx.insert(groupMembers).values(
        groupRows.map((group) => ({
          groupId: group.id,
          userId,
        })),
      );
    });

    const updatedUser = await this.getUserListItem(userId);
    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'users.update',
      entityType: 'user',
      entityId: userId,
      metadata: {
        before: before
          ? {
              fullName: before.fullName,
              status: before.status,
              groupCodes: before.groups.map((group) => group.code),
            }
          : null,
        after: {
          fullName: updatedUser.fullName,
          status: updatedUser.status,
          groupCodes: updatedUser.groups.map((group) => group.code),
        },
      },
    });

    return {
      user: updatedUser,
    };
  }

  async deleteUser(
    userId: string,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<DeleteUserResult> {
    if (userId === actorUserId) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'You cannot delete your own account.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const before = await this.getUserListItem(userId);

    await this.database.transaction(async (tx) => {
      const existingUser = await tx.query.users.findFirst({
        columns: { id: true },
        where: and(eq(users.id, userId), isNull(users.deletedAt)),
      });

      if (!existingUser) {
        throw new AppException(
          {
            code: ApiErrorCode.NOT_FOUND,
            message: 'User not found.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const now = new Date();

      await tx
        .update(users)
        .set({
          status: 'inactive',
          failedLoginAttempts: 0,
          lockedUntil: null,
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));
    });

    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'users.delete',
      entityType: 'user',
      entityId: userId,
      metadata: {
        email: before.email,
        fullName: before.fullName,
        status: before.status,
        groupCodes: before.groups.map((group) => group.code),
      },
    });

    return { deleted: true };
  }

  private async getUserListItem(userId: string): Promise<UserListItem> {
    const user = await this.database.query.users.findFirst({
      columns: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });

    if (!user) {
      throw new AppException(
        {
          code: ApiErrorCode.NOT_FOUND,
          message: 'User not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const groupsByUserId = await this.getGroupsByUserId([user.id]);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      groups: groupsByUserId.get(user.id) ?? [],
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async getGroupsByUserId(userIds: string[]): Promise<Map<string, UserGroupSummary[]>> {
    const groupsByUserId = new Map<string, UserGroupSummary[]>();

    if (userIds.length === 0) {
      return groupsByUserId;
    }

    const rows = await this.database
      .select({
        userId: groupMembers.userId,
        code: groups.code,
        name: groups.name,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(
        and(
          inArray(groupMembers.userId, userIds),
          eq(groups.isActive, true),
          isNull(groups.deletedAt),
        ),
      )
      .orderBy(asc(groups.name));

    for (const row of rows) {
      const currentGroups = groupsByUserId.get(row.userId) ?? [];
      currentGroups.push({
        code: row.code,
        name: row.name,
      });
      groupsByUserId.set(row.userId, currentGroups);
    }

    return groupsByUserId;
  }
}

function buildUserWhere(query: ListUsersDto): SQL<unknown> {
  const conditions: SQL<unknown>[] = [isNull(users.deletedAt)];
  const search = query.search?.trim();

  if (search) {
    const pattern = `%${search}%`;
    const searchCondition = or(ilike(users.email, pattern), ilike(users.fullName, pattern));

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (query.status) {
    conditions.push(eq(users.status, query.status));
  }

  return and(...conditions) as SQL<unknown>;
}
