const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required. Example: postgresql://sa:Center%40123@localhost:5432/aic',
    );
  }

  const targetUrl = new URL(databaseUrl);
  const databaseName = targetUrl.pathname.replace(/^\//, '');

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(databaseName)) {
    throw new Error(
      `Unsafe database name "${databaseName}". Use letters, numbers, underscores, or hyphens.`,
    );
  }

  const maintenanceUrl = new URL(databaseUrl);
  maintenanceUrl.pathname = '/postgres';

  const client = new Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  try {
    const result = await client.query('select 1 from pg_database where datname = $1', [
      databaseName,
    ]);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Database "${databaseName}" already exists.`);
      return;
    }

    await client.query(`create database ${quoteIdentifier(databaseName)}`);
    console.log(`Database "${databaseName}" created.`);
  } finally {
    await client.end();
  }
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
