import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 120 }).notNull(),
    entityType: varchar('entity_type', { length: 120 }).notNull(),
    entityId: varchar('entity_id', { length: 120 }),
    requestId: varchar('request_id', { length: 120 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 500 }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    actorUserIdIdx: index('audit_logs_actor_user_id_idx').on(table.actorUserId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
