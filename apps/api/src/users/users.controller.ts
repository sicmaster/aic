import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentAuditContext } from '../audit/decorators/current-audit-context.decorator';
import type { AuditContext } from '../audit/audit.types';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import type { AuthSessionPayload } from '../auth/auth.types';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import type {
  CreateUserResult,
  DeleteUserResult,
  GetUserResult,
  ListUsersResult,
  UpdateUserResult,
  UserGroupSummary,
} from './users.types';

@Controller('users')
@UseGuards(AuthenticatedSessionGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  async listUsers(@Query() query: ListUsersDto): Promise<ListUsersResult> {
    return this.usersService.listUsers(query);
  }

  @Get('group-options')
  @RequirePermissions('users.read')
  async getGroupOptions(): Promise<UserGroupSummary[]> {
    return this.usersService.getGroupOptions();
  }

  @Get(':id')
  @RequirePermissions('users.read')
  async getUser(@Param('id', new ParseUUIDPipe()) id: string): Promise<GetUserResult> {
    return this.usersService.getUser(id);
  }

  @Post()
  @RequirePermissions('users.create')
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<CreateUserResult> {
    return this.usersService.createUser(dto, session.user.id, auditContext);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<UpdateUserResult> {
    return this.usersService.updateUser(id, dto, session.user.id, auditContext);
  }

  @Delete(':id')
  @RequirePermissions('users.disable')
  async deleteUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentSession() session: AuthSessionPayload,
    @CurrentAuditContext() auditContext: AuditContext,
  ): Promise<DeleteUserResult> {
    return this.usersService.deleteUser(id, session.user.id, auditContext);
  }
}
