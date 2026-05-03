import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const groups = pgTable(
  'groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    activeIdx: index('groups_is_active_idx').on(table.isActive),
    deletedAtIdx: index('groups_deleted_at_idx').on(table.deletedAt),
  }),
);

export const policies = pgTable(
  'policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 120 }).notNull().unique(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    activeIdx: index('policies_is_active_idx').on(table.isActive),
    deletedAtIdx: index('policies_deleted_at_idx').on(table.deletedAt),
  }),
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 160 }).notNull().unique(),
    resource: varchar('resource', { length: 80 }).notNull(),
    action: varchar('action', { length: 80 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resourceActionIdx: index('permissions_resource_action_idx').on(table.resource, table.action),
  }),
);

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.userId] }),
    userIdIdx: index('group_members_user_id_idx').on(table.userId),
  }),
);

export const groupPolicies = pgTable(
  'group_policies',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    policyId: uuid('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.policyId] }),
    policyIdIdx: index('group_policies_policy_id_idx').on(table.policyId),
  }),
);

export const policyPermissions = pgTable(
  'policy_permissions',
  {
    policyId: uuid('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.policyId, table.permissionId] }),
    permissionIdIdx: index('policy_permissions_permission_id_idx').on(table.permissionId),
  }),
);

export const menus = pgTable(
  'menus',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    parentId: uuid('parent_id'),
    code: varchar('code', { length: 120 }).notNull().unique(),
    label: varchar('label', { length: 160 }).notNull(),
    path: varchar('path', { length: 240 }),
    icon: varchar('icon', { length: 80 }),
    level: integer('level').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    parentIdIdx: index('menus_parent_id_idx').on(table.parentId),
    levelIdx: index('menus_level_idx').on(table.level),
    activeIdx: index('menus_is_active_idx').on(table.isActive),
    deletedAtIdx: index('menus_deleted_at_idx').on(table.deletedAt),
  }),
);

export const policyMenus = pgTable(
  'policy_menus',
  {
    policyId: uuid('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'cascade' }),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.policyId, table.menuId] }),
    menuIdIdx: index('policy_menus_menu_id_idx').on(table.menuId),
  }),
);

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Policy = typeof policies.$inferSelect;
export type NewPolicy = typeof policies.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
