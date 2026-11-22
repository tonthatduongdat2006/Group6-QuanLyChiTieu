// Example integration suite for P0-TD-02: proves that each suite gets its own
// schema on the isolated test database. Runs only when TEST_DATABASE_URL is
// configured (see test/setup/test-database.ts); otherwise Jest reports it as
// skipped. It never uses DATABASE_URL.

import {
  createIsolatedDatabase,
  hasTestDatabase,
} from '../setup/test-database';
import type { IsolatedDatabase } from '../setup/test-database';

const describeDb = hasTestDatabase() ? describe : describe.skip;

describeDb('isolated test database (P0-TD-02 harness)', () => {
  let first: IsolatedDatabase;
  let second: IsolatedDatabase;

  beforeAll(async () => {
    first = await createIsolatedDatabase('isolation-a');
    second = await createIsolatedDatabase('isolation-b');
  });

  afterAll(async () => {
    await first?.dispose();
    await second?.dispose();
  });

  it('gives each suite a distinct test_ schema', () => {
    expect(first.schema).toMatch(/^test_/);
    expect(second.schema).toMatch(/^test_/);
    expect(first.schema).not.toBe(second.schema);
  });

  it('keeps tables of one suite invisible to another suite', async () => {
    await first.client.$executeRawUnsafe(
      'CREATE TABLE harness_probe (id integer PRIMARY KEY)',
    );
    await first.client.$executeRawUnsafe(
      'INSERT INTO harness_probe (id) VALUES (1)',
    );
    const rows = await first.client.$queryRawUnsafe<Array<{ n: bigint }>>(
      'SELECT count(*)::bigint AS n FROM harness_probe',
    );
    expect(rows[0].n).toBe(1n);
    await expect(
      second.client.$queryRawUnsafe('SELECT 1 FROM harness_probe'),
    ).rejects.toThrow();
  });
});
