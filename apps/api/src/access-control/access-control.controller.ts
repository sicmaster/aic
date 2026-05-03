import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentAuditContext } from '../audit/decorators/current-audit-context.decorator';
import type { AuditContext } from '../audit/audit.types';
import type { AuthSessionPayload } from '../auth/auth.types';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AccessControlService } from './access-control.service';
import type {
  GetAccessControlGroupResult,
  CreateAccessControlMenuResult,
  DeleteAccessControlMenuResult,
  GetAccessControlMenuResult,
  ListAccessControlGroupsResult,
  ListAccessControlMenusResult,
  ListAccessControlPermissionsResult,
  ListAccessControlPoliciesResult,
  UpdateAccessControlMenuResult,
  UpdateGroupPoliciesResult,
} from './access-control.types';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { UpdateGroupPoliciesDto } from './dto/update-group-policies.dto';

@Controller('access-control')
@UseGuards(AuthenticatedSessionGuard, PermissionsGuard)
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('groups')
  @RequirePermissions('groups.read')
  async listGroups(): Promise<ListAccessControlGroupsResult> {
    return this.accessControlService.listGroups();
  }

  @Get('groups/:code')
  @RequirePermissions('groups.read')
  async getGroup(@Param('code') code: string): Promise<GetAccessControlGroupResult> {
    return this.accessControlService.getGroup(code);
  }

  @Patch('groups/:code/policies')
  @RequirePermissions('groups.update')
  async updateGroupPolicies(
    @Param('code') code: string,
    @Body() dto: UpdateGroupPoliciesDto,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<UpdateGroupPoliciesResult> {
    return this.accessControlService.updateGroupPolicies(code, dto, session.user.id, auditContext);
  }

  @Get('policies')
  @RequirePermissions('policies.read')
  async listPolicies(): Promise<ListAccessControlPoliciesResult> {
    return this.accessControlService.listPolicies();
  }

  @Get('permissions')
  @RequirePermissions('policies.read')
  async listPermissions(): Promise<ListAccessControlPermissionsResult> {
    return this.accessControlService.listPermissions();
  }

  @Get('menus')
  @RequirePermissions('menus.read')
  async listMenus(): Promise<ListAccessControlMenusResult> {
    return this.accessControlService.listMenus();
  }

  @Get('menus/:code')
  @RequirePermissions('menus.read')
  async getMenu(@Param('code') code: string): Promise<GetAccessControlMenuResult> {
    return this.accessControlService.getMenu(code);
  }

  @Post('menus')
  @RequirePermissions('menus.create')
  async createMenu(
    @Body() dto: CreateMenuDto,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<CreateAccessControlMenuResult> {
    return this.accessControlService.createMenu(dto, session.user.id, auditContext);
  }

  @Patch('menus/:code')
  @RequirePermissions('menus.update')
  async updateMenu(
    @Param('code') code: string,
    @Body() dto: UpdateMenuDto,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<UpdateAccessControlMenuResult> {
    return this.accessControlService.updateMenu(code, dto, session.user.id, auditContext);
  }

  @Delete('menus/:code')
  @RequirePermissions('menus.delete')
  async deleteMenu(
    @Param('code') code: string,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<DeleteAccessControlMenuResult> {
    return this.accessControlService.deleteMenu(code, session.user.id, auditContext);
  }
}
