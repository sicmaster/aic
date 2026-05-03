const argon2 = require('argon2');
const { Client } = require('pg');

const PASSWORD_MIN_LENGTH = 12;

const groups = [
  {
    code: 'admin',
    name: 'Admin',
    description: 'Administrators with full management access.',
  },
  {
    code: 'operator',
    name: 'Operator',
    description: 'Operators with day-to-day operational access.',
  },
];

const permissions = [
  ['users.read', 'users', 'read', 'View users.'],
  ['users.create', 'users', 'create', 'Create users.'],
  ['users.update', 'users', 'update', 'Update users.'],
  ['users.disable', 'users', 'disable', 'Disable users.'],
  ['users.reset-password', 'users', 'reset-password', 'Reset user passwords.'],
  ['groups.read', 'groups', 'read', 'View groups.'],
  ['groups.create', 'groups', 'create', 'Create groups.'],
  ['groups.update', 'groups', 'update', 'Update groups.'],
  ['groups.assign-users', 'groups', 'assign-users', 'Assign users to groups.'],
  ['policies.read', 'policies', 'read', 'View policies.'],
  ['policies.create', 'policies', 'create', 'Create policies.'],
  ['policies.update', 'policies', 'update', 'Update policies.'],
  [
    'policies.assign-permissions',
    'policies',
    'assign-permissions',
    'Assign permissions to policies.',
  ],
  ['menus.read', 'menus', 'read', 'View menus.'],
  ['menus.create', 'menus', 'create', 'Create menus.'],
  ['menus.update', 'menus', 'update', 'Update menus.'],
  ['menus.delete', 'menus', 'delete', 'Soft delete menus.'],
  ['audit.read', 'audit', 'read', 'View audit logs.'],
];

const policies = [
  {
    code: 'admin.full-access',
    name: 'Admin Full Access',
    description: 'Full access to first-release admin capabilities.',
    permissionCodes: permissions.map(([code]) => code),
    menuCodes: [
      'setting',
      'setting.users',
      'setting.groups',
      'setting.policies',
      'setting.audit-logs',
      'setting.menus',
    ],
    groupCodes: ['admin'],
  },
  {
    code: 'operator.basic-access',
    name: 'Operator Basic Access',
    description: 'Basic read access for operators.',
    permissionCodes: ['users.read', 'groups.read', 'policies.read', 'menus.read'],
    menuCodes: ['setting', 'setting.users'],
    groupCodes: ['operator'],
  },
];

const menus = [
  {
    code: 'setting',
    label: 'Setting',
    path: '/setting',
    icon: 'settings',
    level: 1,
    sortOrder: 100,
    parentCode: null,
  },
  {
    code: 'setting.users',
    label: 'Users',
    path: '/setting/users',
    icon: 'users',
    level: 2,
    sortOrder: 10,
    parentCode: 'setting',
  },
  {
    code: 'setting.groups',
    label: 'Groups',
    path: '/setting/groups',
    icon: 'users-round',
    level: 2,
    sortOrder: 20,
    parentCode: 'setting',
  },
  {
    code: 'setting.policies',
    label: 'Policies',
    path: '/setting/policies',
    icon: 'shield-check',
    level: 2,
    sortOrder: 30,
    parentCode: 'setting',
  },
  {
    code: 'setting.menus',
    label: 'Menus',
    path: '/setting/menus',
    icon: 'menu',
    level: 2,
    sortOrder: 40,
    parentCode: 'setting',
  },
  {
    code: 'setting.audit-logs',
    label: 'Audit Logs',
    path: '/setting/audit-logs',
    icon: 'history',
    level: 2,
    sortOrder: 50,
    parentCode: 'setting',
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Example: postgresql://sa:Center%40123@localhost:5432/aic',
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('begin');
    await seedGroups(client);
    await seedPermissions(client);
    await seedMenus(client);
    await seedPolicies(client);
    await seedInitialAdmin(client);
    await client.query('commit');
    console.log('RBAC and menu seed completed.');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

async function seedGroups(client) {
  for (const group of groups) {
    await client.query(
      `
        insert into groups (code, name, description, is_system, is_active)
        values ($1, $2, $3, true, true)
        on conflict (code) do update
        set name = excluded.name,
            description = excluded.description,
            is_system = true,
            is_active = true,
            deleted_at = null,
            updated_at = now()
      `,
      [group.code, group.name, group.description],
    );
  }
}

async function seedPermissions(client) {
  for (const [code, resource, action, description] of permissions) {
    await client.query(
      `
        insert into permissions (code, resource, action, description)
        values ($1, $2, $3, $4)
        on conflict (code) do update
        set resource = excluded.resource,
            action = excluded.action,
            description = excluded.description
      `,
      [code, resource, action, description],
    );
  }
}

async function seedMenus(client) {
  for (const menu of menus) {
    const parentId = menu.parentCode ? await findIdByCode(client, 'menus', menu.parentCode) : null;

    await client.query(
      `
        insert into menus (parent_id, code, label, path, icon, level, sort_order, is_system, is_active)
        values ($1, $2, $3, $4, $5, $6, $7, true, true)
        on conflict (code) do update
        set parent_id = excluded.parent_id,
            label = excluded.label,
            path = excluded.path,
            icon = excluded.icon,
            level = excluded.level,
            sort_order = excluded.sort_order,
            is_system = true,
            is_active = true,
            deleted_at = null,
            updated_at = now()
      `,
      [parentId, menu.code, menu.label, menu.path, menu.icon, menu.level, menu.sortOrder],
    );
  }
}

async function seedPolicies(client) {
  for (const policy of policies) {
    const policyId = await upsertPolicy(client, policy);

    for (const permissionCode of policy.permissionCodes) {
      const permissionId = await findIdByCode(client, 'permissions', permissionCode);
      await client.query(
        `
          insert into policy_permissions (policy_id, permission_id)
          values ($1, $2)
          on conflict (policy_id, permission_id) do nothing
        `,
        [policyId, permissionId],
      );
    }

    for (const menuCode of policy.menuCodes) {
      const menuId = await findIdByCode(client, 'menus', menuCode);
      await client.query(
        `
          insert into policy_menus (policy_id, menu_id)
          values ($1, $2)
          on conflict (policy_id, menu_id) do nothing
        `,
        [policyId, menuId],
      );
    }

    for (const groupCode of policy.groupCodes) {
      const groupId = await findIdByCode(client, 'groups', groupCode);
      await client.query(
        `
          insert into group_policies (group_id, policy_id)
          values ($1, $2)
          on conflict (group_id, policy_id) do nothing
        `,
        [groupId, policyId],
      );
    }
  }
}

async function seedInitialAdmin(client) {
  const rawEmail = process.env.INITIAL_ADMIN_EMAIL;

  if (!rawEmail) {
    console.log('Initial admin seed skipped. Set INITIAL_ADMIN_EMAIL to enable it.');
    return;
  }

  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_FULL_NAME || 'System Admin';
  const resetPassword = readBooleanEnv('INITIAL_ADMIN_RESET_PASSWORD', false);
  const email = rawEmail.trim().toLowerCase();

  if (!password) {
    throw new Error('INITIAL_ADMIN_PASSWORD is required when INITIAL_ADMIN_EMAIL is set.');
  }

  assertPasswordPolicy(password);

  const existingUser = await client.query('select id from users where email = $1', [email]);
  let userId;

  if (existingUser.rowCount === 0) {
    const passwordHash = await hashPassword(password);
    const result = await client.query(
      `
        insert into users (
          email,
          password_hash,
          full_name,
          status,
          failed_login_attempts,
          password_changed_at
        )
        values ($1, $2, $3, 'active', 0, now())
        returning id
      `,
      [email, passwordHash, fullName],
    );
    userId = result.rows[0].id;
  } else {
    userId = existingUser.rows[0].id;

    if (resetPassword) {
      const passwordHash = await hashPassword(password);
      await client.query(
        `
          update users
          set password_hash = $2,
              full_name = $3,
              status = 'active',
              failed_login_attempts = 0,
              locked_until = null,
              password_changed_at = now(),
              deleted_at = null,
              updated_at = now()
          where id = $1
        `,
        [userId, passwordHash, fullName],
      );
    } else {
      await client.query(
        `
          update users
          set full_name = $2,
              status = 'active',
              deleted_at = null,
              updated_at = now()
          where id = $1
        `,
        [userId, fullName],
      );
    }
  }

  const adminGroupId = await findIdByCode(client, 'groups', 'admin');
  await client.query(
    `
      insert into group_members (group_id, user_id)
      values ($1, $2)
      on conflict (group_id, user_id) do nothing
    `,
    [adminGroupId, userId],
  );

  console.log(`Initial admin seed completed for ${email}.`);
}

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

function assertPasswordPolicy(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`INITIAL_ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
}

function readBooleanEnv(key, fallback) {
  const value = process.env[key];

  if (value === undefined || value === '') {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false".`);
}

async function upsertPolicy(client, policy) {
  const result = await client.query(
    `
      insert into policies (code, name, description, is_system, is_active)
      values ($1, $2, $3, true, true)
      on conflict (code) do update
      set name = excluded.name,
          description = excluded.description,
          is_system = true,
          is_active = true,
          deleted_at = null,
          updated_at = now()
      returning id
    `,
    [policy.code, policy.name, policy.description],
  );

  return result.rows[0].id;
}

async function findIdByCode(client, table, code) {
  if (!['groups', 'permissions', 'policies', 'menus'].includes(table)) {
    throw new Error(`Unsupported lookup table: ${table}`);
  }

  const result = await client.query(`select id from ${table} where code = $1`, [code]);

  if (result.rowCount !== 1) {
    throw new Error(`Missing ${table} record for code: ${code}`);
  }

  return result.rows[0].id;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
