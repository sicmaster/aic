import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { DATABASE } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { auditLogs, users } from '../database/schema';
import type { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import type { ListAuditLogsResult, RecordAuditLogInput } from './audit.types';

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async listAuditLogs(query: ListAuditLogsDto): Promise<ListAuditLogsResult> {
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const where = buildAuditWhere(query);

    const [totalRows, rows] = await Promise.all([
      this.database
        .select({ value: count() })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(where),
      this.database
        .select({
          id: auditLogs.id,
          actorUserId: auditLogs.actorUserId,
          actorEmail: users.email,
          actorFullName: users.fullName,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          requestId: auditLogs.requestId,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);
    const total = Number(totalRows[0]?.value ?? 0);

    return {
      items: rows.map((row) => ({
        id: row.id,
        actor: row.actorUserId
          ? {
              id: row.actorUserId,
              email: row.actorEmail ?? 'unknown',
              fullName: row.actorFullName ?? 'Unknown user',
            }
          : null,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        requestId: row.requestId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.database.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: input.requestId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata,
    });
  }
}

function buildAuditWhere(query: ListAuditLogsDto): SQL<unknown> | undefined {
  const conditions: SQL<unknown>[] = [];

  if (query.action) {
    conditions.push(eq(auditLogs.action, query.action.trim()));
  }

  if (query.entityType) {
    conditions.push(eq(auditLogs.entityType, query.entityType.trim()));
  }

  const search = query.search?.trim();

  if (search) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(auditLogs.action, pattern),
      ilike(auditLogs.entityType, pattern),
      ilike(auditLogs.entityId, pattern),
      ilike(users.email, pattern),
      ilike(users.fullName, pattern),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}
