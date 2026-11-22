// Example concurrency suite for P0-TD-02 ("1 suite concurrency"). It exercises
// the harness pattern that IT-CONC-BAL will use (docs/backend-plan.md §5.1:
// lock the user row, compute projected balance, reject if < 0) on a throwaway
// table inside an isolated schema. It is a harness demonstration, not the
// business test: the real schema arrives with P1-BE-01.
// Runs only when TEST_DATABASE_URL is configured; otherwise it is skipped.

import {
  createCheckpoint,
  runConcurrently,
  withTimeout,
} from '../helpers/concurrency';
import {
  createIsolatedDatabase,
  hasTestDatabase,
} from '../setup/test-database';
import type { IsolatedDatabase, RawSql } from '../setup/test-database';

const describeDb = hasTestDatabase() ? describe : describe.skip;

class InsufficientBalance extends Error {}

async function withdraw(
  db: IsolatedDatabase,
  amount: bigint,
  whileLocked?: () => Promise<void>,
): Promise<bigint> {
  return db.client.$transaction(async (tx: RawSql) => {
    const rows = await tx.$queryRawUnsafe<Array<{ available: bigint }>>(
      'SELECT available FROM harness_balance WHERE id = 1 FOR UPDATE',
    );
    const projected = rows[0].available - amount;
    if (whileLocked) {
      await whileLocked();
    }
    if (projected < 0n) {
      throw new InsufficientBalance();
    }
    await tx.$executeRawUnsafe(
      'UPDATE harness_balance SET available = $1 WHERE id = 1',
      projected,
    );
    return projected;
  });
}

async function balance(db: IsolatedDatabase): Promise<bigint> {
  const rows = await db.client.$queryRawUnsafe<Array<{ available: bigint }>>(
    'SELECT available FROM harness_balance WHERE id = 1',
  );
  return rows[0].available;
}

describeDb('row-lock concurrency (P0-TD-02 harness)', () => {
  let db: IsolatedDatabase;

  beforeAll(async () => {
    db = await createIsolatedDatabase('row-lock-concurrency');
    await db.client.$executeRawUnsafe(
      `CREATE TABLE harness_balance (
         id integer PRIMARY KEY,
         available bigint NOT NULL CHECK (available >= 0)
       )`,
    );
  });

  afterAll(async () => {
    await db?.dispose();
  });

  beforeEach(async () => {
    await db.client.$executeRawUnsafe('DELETE FROM harness_balance');
    await db.client.$executeRawUnsafe(
      'INSERT INTO harness_balance (id, available) VALUES (1, 100000)',
    );
  });

  it('never lets N parallel withdrawals push the balance below zero', async () => {
    const result = await runConcurrently(10, () => withdraw(db, 30000n));
    expect(result.fulfilled).toHaveLength(3);
    expect(result.rejected).toHaveLength(7);
    for (const reason of result.rejected) {
      expect(reason).toBeInstanceOf(InsufficientBalance);
    }
    expect(await balance(db)).toBe(10000n);
  });

  it('serialises a second operation behind a held lock', async () => {
    const checkpoint = createCheckpoint();
    const first = withdraw(db, 80000n, () => checkpoint.arrive());
    await checkpoint.reached();
    const second = withdraw(db, 50000n);
    checkpoint.release();
    await expect(withTimeout(first, 10000, 'first')).resolves.toBe(20000n);
    await expect(withTimeout(second, 10000, 'second')).rejects.toBeInstanceOf(
      InsufficientBalance,
    );
    expect(await balance(db)).toBe(20000n);
  });
});
