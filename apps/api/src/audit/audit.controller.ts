import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AuditService } from './audit.service';
import type { ListAuditLogsResult } from './audit.types';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('audit-logs')
@UseGuards(AuthenticatedSessionGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  async listAuditLogs(@Query() query: ListAuditLogsDto): Promise<ListAuditLogsResult> {
    return this.auditService.listAuditLogs(query);
  }
}
