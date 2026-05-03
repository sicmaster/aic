import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import type { AuditContext } from '../audit/audit.types';
import { ApiErrorCode } from '../common/errors/api-error-code';
import { AppException } from '../common/errors/app.exception';
import { DATABASE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import {
  groupPolicies,
  groups,
  type Menu,
  menus,
  permissions,
  policies,
  policyMenus,
  policyPermissions,
} from '../database/schema';
import type { UpdateGroupPoliciesDto } from './dto/update-group-policies.dto';
import type { CreateMenuDto } from './dto/create-menu.dto';
import type { UpdateMenuDto } from './dto/update-menu.dto';
import type {
  AccessControlGroup,
  AccessControlMenu,
  AccessControlPermission,
  AccessControlPolicy,
  AccessControlPolicySummary,
  CreateAccessControlMenuResult,
  DeleteAccessControlMenuResult,
  GetAccessControlGroupResult,
  GetAccessControlMenuResult,
  ListAccessControlGroupsResult,
  ListAccessControlMenusResult,
  ListAccessControlPermissionsResult,
  ListAccessControlPoliciesResult,
  UpdateAccessControlMenuResult,
  UpdateGroupPoliciesResult,
} from './access-control.types';

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly auditService: AuditService,
  ) {}

  async listGroups(): Promise<ListAccessControlGroupsResult> {
    const groupRows = await this.database
      .select({
        code: groups.code,
        name: groups.name,
        description: groups.description,
        isSystem: groups.isSystem,
        isActive: groups.isActive,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
      })
      .from(groups)
      .where(isNull(groups.deletedAt))
      .orderBy(asc(groups.name));
    const policiesByGroupCode = await this.getPoliciesByGroupCode(
      groupRows.map((group) => group.code),
    );

    return {
      items: groupRows.map((group) => ({
        ...group,
        policies: policiesByGroupCode.get(group.code) ?? [],
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      })),
    };
  }

  async getGroup(groupCode: string): Promise<GetAccessControlGroupResult> {
    return {
      group: await this.getGroupByCode(groupCode),
    };
  }

  async listPolicies(): Promise<ListAccessControlPoliciesResult> {
    const policyRows = await this.database
      .select({
        code: policies.code,
        name: policies.name,
        description: policies.description,
        isSystem: policies.isSystem,
        isActive: policies.isActive,
        createdAt: policies.createdAt,
        updatedAt: policies.updatedAt,
      })
      .from(policies)
      .where(isNull(policies.deletedAt))
      .orderBy(asc(policies.name));
    const policyCodes = policyRows.map((policy) => policy.code);
    const [permissionsByPolicyCode, menusByPolicyCode] = await Promise.all([
      this.getPermissionsByPolicyCode(policyCodes),
      this.getMenusByPolicyCode(policyCodes),
    ]);

    return {
      items: policyRows.map((policy) => ({
        ...policy,
        permissions: permissionsByPolicyCode.get(policy.code) ?? [],
        menus: menusByPolicyCode.get(policy.code) ?? [],
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
      })),
    };
  }

  async listPermissions(): Promise<ListAccessControlPermissionsResult> {
    const rows = await this.database
      .select({
        code: permissions.code,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(asc(permissions.resource), asc(permissions.action));

    return { items: rows };
  }

  async listMenus(): Promise<ListAccessControlMenusResult> {
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
        isActive: menus.isActive,
        isSystem: menus.isSystem,
        createdAt: menus.createdAt,
        updatedAt: menus.updatedAt,
      })
      .from(menus)
      .where(isNull(menus.deletedAt))
      .orderBy(asc(menus.level), asc(menus.sortOrder), asc(menus.label));

    return { items: buildMenuTree(rows) };
  }

  async getMenu(menuCode: string): Promise<GetAccessControlMenuResult> {
    return {
      menu: await this.getMenuByCode(menuCode),
    };
  }

  async createMenu(
    dto: CreateMenuDto,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<CreateAccessControlMenuResult> {
    const now = new Date();
    const normalized = normalizeMenuInput(dto);
    const parent = await this.resolveParentMenu(normalized.parentCode, normalized.level);

    const existingMenu = await this.database.query.menus.findFirst({
      columns: { id: true },
      where: eq(menus.code, normalized.code),
    });

    if (existingMenu) {
      throw new AppException(
        {
          code: ApiErrorCode.CONFLICT,
          message: 'Menu code is already in use.',
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.database.insert(menus).values({
      code: normalized.code,
      label: normalized.label,
      parentId: parent?.id ?? null,
      path: normalized.path,
      icon: normalized.icon,
      level: normalized.level,
      sortOrder: normalized.sortOrder,
      isActive: normalized.isActive,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    const menu = await this.getMenuByCode(normalized.code);
    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'menus.create',
      entityType: 'menu',
      entityId: menu.code,
      metadata: toMenuAuditMetadata(menu),
    });

    return { menu };
  }

  async updateMenu(
    menuCode: string,
    dto: UpdateMenuDto,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<UpdateAccessControlMenuResult> {
    const existingMenu = await this.database.query.menus.findFirst({
      where: and(eq(menus.code, menuCode), isNull(menus.deletedAt)),
    });

    if (!existingMenu) {
      throw new AppException(
        {
          code: ApiErrorCode.NOT_FOUND,
          message: 'Menu not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const before = await this.getMenuByCode(menuCode);
    const normalized = normalizeMenuInput({ ...dto, code: menuCode });
    const parent = await this.resolveParentMenu(
      normalized.parentCode,
      normalized.level,
      existingMenu.id,
    );

    await this.database
      .update(menus)
      .set({
        label: normalized.label,
        parentId: parent?.id ?? null,
        path: normalized.path,
        icon: normalized.icon,
        level: normalized.level,
        sortOrder: normalized.sortOrder,
        isActive: normalized.isActive,
        updatedAt: new Date(),
      })
      .where(eq(menus.id, existingMenu.id));

    const menu = await this.getMenuByCode(menuCode);
    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'menus.update',
      entityType: 'menu',
      entityId: menu.code,
      metadata: {
        before: toMenuAuditMetadata(before),
        after: toMenuAuditMetadata(menu),
      },
    });

    return { menu };
  }

  async deleteMenu(
    menuCode: string,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<DeleteAccessControlMenuResult> {
    const existingMenu = await this.database.query.menus.findFirst({
      where: and(eq(menus.code, menuCode), isNull(menus.deletedAt)),
    });

    if (!existingMenu) {
      throw new AppException(
        {
          code: ApiErrorCode.NOT_FOUND,
          message: 'Menu not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (existingMenu.isSystem) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'System menus cannot be deleted.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const childMenu = await this.database.query.menus.findFirst({
      columns: { id: true },
      where: and(eq(menus.parentId, existingMenu.id), isNull(menus.deletedAt)),
    });

    if (childMenu) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Menu with active children cannot be deleted.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const before = await this.getMenuByCode(menuCode);
    await this.database
      .update(menus)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(menus.id, existingMenu.id));

    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'menus.delete',
      entityType: 'menu',
      entityId: menuCode,
      metadata: toMenuAuditMetadata(before),
    });

    return { deleted: true };
  }

  async updateGroupPolicies(
    groupCode: string,
    dto: UpdateGroupPoliciesDto,
    actorUserId: string,
    auditContext: AuditContext,
  ): Promise<UpdateGroupPoliciesResult> {
    const policyCodes = [...new Set(dto.policyCodes.map((code) => code.trim()).filter(Boolean))];
    const before = await this.getGroupByCode(groupCode);

    if (groupCode === 'admin' && !policyCodes.includes('admin.full-access')) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Admin group must keep the admin.full-access policy.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.database.transaction(async (tx) => {
      const group = await tx.query.groups.findFirst({
        columns: { id: true },
        where: and(eq(groups.code, groupCode), isNull(groups.deletedAt)),
      });

      if (!group) {
        throw new AppException(
          {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Group not found.',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const policyRows =
        policyCodes.length > 0
          ? await tx
              .select({
                id: policies.id,
                code: policies.code,
              })
              .from(policies)
              .where(
                and(
                  inArray(policies.code, policyCodes),
                  eq(policies.isActive, true),
                  isNull(policies.deletedAt),
                ),
              )
          : [];

      if (policyRows.length !== policyCodes.length) {
        throw new AppException(
          {
            code: ApiErrorCode.BAD_REQUEST,
            message: 'One or more policies are invalid.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await tx.delete(groupPolicies).where(eq(groupPolicies.groupId, group.id));

      if (policyRows.length > 0) {
        await tx.insert(groupPolicies).values(
          policyRows.map((policy) => ({
            groupId: group.id,
            policyId: policy.id,
            assignedBy: actorUserId,
          })),
        );
      }
    });

    const group = await this.getGroupByCode(groupCode);
    await this.auditService.record({
      ...auditContext,
      actorUserId,
      action: 'groups.update-policies',
      entityType: 'group',
      entityId: group.code,
      metadata: {
        before: {
          policyCodes: before.policies.map((policy) => policy.code),
        },
        after: {
          policyCodes: group.policies.map((policy) => policy.code),
        },
      },
    });

    return {
      group,
    };
  }

  private async getGroupByCode(groupCode: string): Promise<AccessControlGroup> {
    const group = await this.database.query.groups.findFirst({
      columns: {
        code: true,
        name: true,
        description: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      where: and(eq(groups.code, groupCode), isNull(groups.deletedAt)),
    });

    if (!group) {
      throw new AppException(
        {
          code: ApiErrorCode.NOT_FOUND,
          message: 'Group not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const policiesByGroupCode = await this.getPoliciesByGroupCode([group.code]);

    return {
      ...group,
      policies: policiesByGroupCode.get(group.code) ?? [],
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  private async getPoliciesByGroupCode(
    groupCodes: string[],
  ): Promise<Map<string, AccessControlPolicySummary[]>> {
    const result = new Map<string, AccessControlPolicySummary[]>();

    if (groupCodes.length === 0) {
      return result;
    }

    const rows = await this.database
      .select({
        groupCode: groups.code,
        code: policies.code,
        name: policies.name,
        description: policies.description,
        isSystem: policies.isSystem,
        isActive: policies.isActive,
      })
      .from(groups)
      .innerJoin(groupPolicies, eq(groups.id, groupPolicies.groupId))
      .innerJoin(policies, eq(groupPolicies.policyId, policies.id))
      .where(and(inArray(groups.code, groupCodes), isNull(policies.deletedAt)))
      .orderBy(asc(policies.name));

    for (const row of rows) {
      const current = result.get(row.groupCode) ?? [];
      current.push({
        code: row.code,
        name: row.name,
        description: row.description,
        isSystem: row.isSystem,
        isActive: row.isActive,
      });
      result.set(row.groupCode, current);
    }

    return result;
  }

  private async getPermissionsByPolicyCode(
    policyCodes: string[],
  ): Promise<Map<string, AccessControlPermission[]>> {
    const result = new Map<string, AccessControlPermission[]>();

    if (policyCodes.length === 0) {
      return result;
    }

    const rows = await this.database
      .select({
        policyCode: policies.code,
        code: permissions.code,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(policies)
      .innerJoin(policyPermissions, eq(policies.id, policyPermissions.policyId))
      .innerJoin(permissions, eq(policyPermissions.permissionId, permissions.id))
      .where(and(inArray(policies.code, policyCodes), isNull(policies.deletedAt)))
      .orderBy(asc(permissions.resource), asc(permissions.action));

    for (const row of rows) {
      const current = result.get(row.policyCode) ?? [];
      current.push({
        code: row.code,
        resource: row.resource,
        action: row.action,
        description: row.description,
      });
      result.set(row.policyCode, current);
    }

    return result;
  }

  private async getMenusByPolicyCode(
    policyCodes: string[],
  ): Promise<Map<string, AccessControlMenu[]>> {
    const result = new Map<string, AccessControlMenu[]>();

    if (policyCodes.length === 0) {
      return result;
    }

    const rows = await this.database
      .select({
        policyCode: policies.code,
        id: menus.id,
        parentId: menus.parentId,
        code: menus.code,
        label: menus.label,
        path: menus.path,
        icon: menus.icon,
        level: menus.level,
        sortOrder: menus.sortOrder,
        isActive: menus.isActive,
        isSystem: menus.isSystem,
        createdAt: menus.createdAt,
        updatedAt: menus.updatedAt,
      })
      .from(policies)
      .innerJoin(policyMenus, eq(policies.id, policyMenus.policyId))
      .innerJoin(menus, eq(policyMenus.menuId, menus.id))
      .where(
        and(
          inArray(policies.code, policyCodes),
          isNull(policies.deletedAt),
          isNull(menus.deletedAt),
        ),
      )
      .orderBy(asc(menus.level), asc(menus.sortOrder), asc(menus.label));

    const rowsByPolicyCode = new Map<string, MenuRow[]>();

    for (const row of rows) {
      const current = rowsByPolicyCode.get(row.policyCode) ?? [];
      current.push({
        id: row.id,
        parentId: row.parentId,
        code: row.code,
        label: row.label,
        path: row.path,
        icon: row.icon,
        level: row.level,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        isSystem: row.isSystem,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      rowsByPolicyCode.set(row.policyCode, current);
    }

    for (const [policyCode, policyMenus] of rowsByPolicyCode.entries()) {
      result.set(policyCode, buildMenuTree(policyMenus));
    }

    return result;
  }

  private async getMenuByCode(menuCode: string): Promise<AccessControlMenu> {
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
        isActive: menus.isActive,
        isSystem: menus.isSystem,
        createdAt: menus.createdAt,
        updatedAt: menus.updatedAt,
      })
      .from(menus)
      .where(isNull(menus.deletedAt))
      .orderBy(asc(menus.level), asc(menus.sortOrder), asc(menus.label));
    const menu = flattenMenus(buildMenuTree(rows)).find((item) => item.code === menuCode);

    if (!menu) {
      throw new AppException(
        {
          code: ApiErrorCode.NOT_FOUND,
          message: 'Menu not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return menu;
  }

  private async resolveParentMenu(
    parentCode: string | undefined,
    level: number,
    currentMenuId?: string,
  ): Promise<Pick<Menu, 'id' | 'level'> | null> {
    if (level === 1) {
      if (parentCode) {
        throw new AppException(
          {
            code: ApiErrorCode.BAD_REQUEST,
            message: 'Level 1 menus cannot have a parent.',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return null;
    }

    if (!parentCode) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Parent menu is required for level 2 and 3 menus.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const parent = await this.database.query.menus.findFirst({
      columns: { id: true, level: true },
      where: and(eq(menus.code, parentCode), isNull(menus.deletedAt)),
    });

    if (!parent) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Parent menu is invalid.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parent.id === currentMenuId) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Menu cannot be its own parent.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parent.level !== level - 1) {
      throw new AppException(
        {
          code: ApiErrorCode.BAD_REQUEST,
          message: 'Parent menu level must be exactly one level above the menu.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return parent;
  }
}

type MenuRow = Omit<AccessControlMenu, 'children' | 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

function buildMenuTree(rows: MenuRow[]): AccessControlMenu[] {
  const uniqueRows = uniqueMenus(rows);
  const nodes = new Map<string, AccessControlMenu>();

  for (const row of uniqueRows) {
    nodes.set(row.id, {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      children: [],
    });
  }

  const roots: AccessControlMenu[] = [];

  for (const row of uniqueRows) {
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

function flattenMenus(menusToFlatten: AccessControlMenu[]): AccessControlMenu[] {
  return menusToFlatten.flatMap((menu) => [menu, ...flattenMenus(menu.children)]);
}

type NormalizedMenuInput = {
  code: string;
  label: string;
  parentCode: string | undefined;
  path: string | null;
  icon: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
};

function normalizeMenuInput(input: {
  code: string;
  icon?: string;
  isActive?: boolean;
  label: string;
  level: number;
  parentCode?: string;
  path?: string;
  sortOrder?: number;
}): NormalizedMenuInput {
  return {
    code: input.code.trim(),
    label: input.label.trim(),
    parentCode: input.parentCode?.trim() || undefined,
    path: input.path?.trim() || null,
    icon: input.icon?.trim() || null,
    level: input.level,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  };
}

function toMenuAuditMetadata(menu: AccessControlMenu) {
  return {
    code: menu.code,
    label: menu.label,
    path: menu.path,
    icon: menu.icon,
    level: menu.level,
    sortOrder: menu.sortOrder,
    isActive: menu.isActive,
    parentId: menu.parentId,
  };
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

function sortMenus(menusToSort: AccessControlMenu[]): AccessControlMenu[] {
  return menusToSort
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((menu) => ({
      ...menu,
      children: sortMenus(menu.children),
    }));
}
