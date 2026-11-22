// Isolated PostgreSQL for integration tests (P0-TD-02: "DB test cô lập mỗi
// suite"; test-strategy §1.3 "Test trên PostgreSQL thật", §7 "Test: DB mới mỗi
// lần chạy").
//
// Safety rules:
// - Tests read TEST_DATABASE_URL only. DATABASE_URL (the development database)
//   is never used, and a TEST_DATABASE_URL that points at the same database
//   is rejected.
// - The database name must contain "test", so a development or production
//   database cannot be selected by accident.
// - Each suite gets its own schema `test_<suite>_<pid>_<random>`; only schemas
//   with that prefix are ever dropped.
// - Connection strings are never printed or included in error messages.
//
// Which server provides TEST_DATABASE_URL is a pending group decision
// (Q2 / P0-TD-02 test database strategy); without it the suites are skipped.

import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { findRepoRoot } from '../helpers/ai-fixtures';

export class TestDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestDatabaseConfigError';
  }
}

interface ParsedTarget {
  host: string;
  port: string;
  database: string;
}

function parseTarget(url: string, variable: string): ParsedTarget {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TestDatabaseConfigError(`${variable} is not a valid URL`);
  }
  if (!['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    throw new TestDatabaseConfigError(`${variable} must be a PostgreSQL URL`);
  }
  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  };
}

/**
 * Returns TEST_DATABASE_URL after the safety checks, or null when it is not
 * configured (integration suites are then skipped, not faked).
 */
export function resolveTestDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = env.TEST_DATABASE_URL;
  if (!url) {
    return null;
  }
  const target = parseTarget(url, 'TEST_DATABASE_URL');
  if (!/test/i.test(target.database)) {
    throw new TestDatabaseConfigError(
      'TEST_DATABASE_URL must name a database whose name contains "test"',
    );
  }
  if (env.DATABASE_URL) {
    const dev = parseTarget(env.DATABASE_URL, 'DATABASE_URL');
    if (
      dev.host === target.host &&
      dev.port === target.port &&
      dev.database === target.database
    ) {
      throw new TestDatabaseConfigError(
        'TEST_DATABASE_URL points at the same database as DATABASE_URL',
      );
    }
  }
  return url;
}

export function hasTestDatabase(env: NodeJS.ProcessEnv = process.env) {
  return resolveTestDatabaseUrl(env) !== null;
}

const SCHEMA_PATTERN = /^test_[a-z0-9_]{1,50}$/;

export function buildIsolatedSchemaName(
  suite: string,
  random: string = randomBytes(4).toString('hex'),
): string {
  const slug =
    suite
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24) || 'suite';
  const name = `test_${slug}_${process.pid}_${random}`;
  if (!SCHEMA_PATTERN.test(name)) {
    throw new TestDatabaseConfigError('Invalid isolated schema name');
  }
  return name;
}

export function withSchema(url: string, schema: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('schema', schema);
  return parsed.toString();
}

/** Raw SQL surface shared by PrismaClient and its transaction client. */
export interface RawSql {
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(
    query: string,
    ...values: unknown[]
  ): Promise<T>;
}

/** Minimal surface of PrismaClient used by the harness. */
export interface RawSqlClient extends RawSql {
  $transaction<T>(fn: (tx: RawSql) => Promise<T>): Promise<T>;
  $disconnect(): Promise<void>;
}

export interface IsolatedDatabase {
  schema: string;
  /** Client whose search_path is the isolated schema. */
  client: RawSqlClient;
  /** Drops the isolated schema and disconnects. */
  dispose(): Promise<void>;
}

function createPrismaClient(url: string): RawSqlClient {
  // Loaded lazily so harness tests without a database never need a generated
  // Prisma client. Requires `prisma generate` (done by test:integration).
  const requireFromApi = createRequire(
    join(findRepoRoot(), 'apps', 'api', 'package.json'),
  );
  const { PrismaClient } = requireFromApi('@prisma/client') as {
    PrismaClient: new (options: { datasourceUrl: string }) => RawSqlClient;
  };
  return new PrismaClient({ datasourceUrl: url });
}

/** Create a fresh schema for one suite on the isolated test database. */
export async function createIsolatedDatabase(
  suite: string,
): Promise<IsolatedDatabase> {
  const baseUrl = resolveTestDatabaseUrl();
  if (!baseUrl) {
    throw new TestDatabaseConfigError('TEST_DATABASE_URL is not configured');
  }
  const schema = buildIsolatedSchemaName(suite);
  const admin = createPrismaClient(baseUrl);
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await admin.$disconnect();
  }
  const client = createPrismaClient(withSchema(baseUrl, schema));
  return {
    schema,
    client,
    dispose: async () => {
      await client.$disconnect();
      if (!SCHEMA_PATTERN.test(schema)) {
        return;
      }
      const cleanup = createPrismaClient(baseUrl);
      try {
        await cleanup.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
        );
      } finally {
        await cleanup.$disconnect();
      }
    },
  };
}
