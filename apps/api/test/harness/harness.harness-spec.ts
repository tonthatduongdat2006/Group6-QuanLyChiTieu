// Self-tests for the backend test harness (P0-TD-02, P0-TD-04).
// Runs without a database and without network: `pnpm --filter api test:harness`.

import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import {
  ALL_DRAFT_STATUSES,
  createTestDataFactory,
  deterministicUuid,
} from '../factories';
import { loadAiFixture, loadAllAiFixtures } from '../helpers/ai-fixtures';
import {
  FixedClock,
  installFakeSystemTime,
  toVnDate,
  vnLocalTime,
} from '../helpers/clock';
import {
  createCheckpoint,
  createGate,
  runConcurrently,
  withTimeout,
} from '../helpers/concurrency';
import {
  FakeAIProvider,
  FakeAIProviderError,
} from '../helpers/fake-ai-provider';
import { renderSyntheticReceipt } from '../helpers/synthetic-receipt-image';
import { applyTestEnvironment } from '../setup/test-env';
import {
  TestDatabaseConfigError,
  buildIsolatedSchemaName,
  resolveTestDatabaseUrl,
} from '../setup/test-database';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('test environment', () => {
  it('runs in Asia/Ho_Chi_Minh with the fake AI provider', () => {
    expect(process.env.TZ).toBe('Asia/Ho_Chi_Minh');
    expect(process.env.AI_PROVIDER).toBe('fake');
  });

  it('refuses a live AI provider', () => {
    expect(() => applyTestEnvironment({ AI_PROVIDER: 'claude' })).toThrow(
      /AI_PROVIDER=fake/,
    );
  });
});

describe('clock (Asia/Ho_Chi_Minh)', () => {
  it('uses the Vietnam calendar date, not the UTC date', () => {
    const clock = new FixedClock(vnLocalTime('2026-11-15T06:30:00'));
    expect(clock.now().toISOString()).toBe('2026-11-14T23:30:00.000Z');
    expect(clock.todayVn()).toBe('2026-11-15');
  });

  it('advances only when told to', () => {
    const clock = new FixedClock('2026-11-15T23:59:00+07:00');
    expect(clock.todayVn()).toBe('2026-11-15');
    clock.advance(60_000);
    expect(clock.todayVn()).toBe('2026-11-16');
  });

  it('can freeze the system time with Jest fake timers', () => {
    installFakeSystemTime(jest, '2026-11-15T09:00:00+07:00');
    try {
      expect(toVnDate(new Date())).toBe('2026-11-15');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('concurrency helpers', () => {
  it('starts every task before any of them finishes', async () => {
    let started = 0;
    const gate = createGate();
    const run = runConcurrently(5, async (index) => {
      started += 1;
      await gate.wait();
      return index;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(started).toBe(5);
    gate.open();
    const result = await run;
    expect(result.fulfilled.sort()).toEqual([0, 1, 2, 3, 4]);
    expect(result.rejected).toHaveLength(0);
  });

  it('collects rejections without stopping other tasks', async () => {
    const result = await runConcurrently(4, async (index) => {
      if (index % 2) {
        throw new Error(`task ${index}`);
      }
      return index;
    });
    expect(result.fulfilled.sort()).toEqual([0, 2]);
    expect(result.rejected).toHaveLength(2);
  });

  it('forces an execution order with a checkpoint', async () => {
    const order: string[] = [];
    const checkpoint = createCheckpoint();
    const first = (async () => {
      order.push('A:start');
      await checkpoint.arrive();
      order.push('A:end');
    })();
    await checkpoint.reached();
    order.push('B:runs-while-A-paused');
    checkpoint.release();
    await withTimeout(first, 1000, 'operation A');
    expect(order).toEqual(['A:start', 'B:runs-while-A-paused', 'A:end']);
  });
});

describe('factories', () => {
  const clock = new FixedClock('2026-11-15T09:00:00+07:00');

  it('builds ERD v1.1 records with bigint money and VN dates', () => {
    const f = createTestDataFactory({ clock, seed: 'harness' });
    const { userA, userB } = f.userPair();
    const food = f.category(userA);
    const tx = f.transaction(userA, food);
    const jar = f.savingJar(userA);
    const batch = f.draftBatch(userA, { source_type: 'AI_SCAN' });
    const draft = f.draft(batch, { status: 'READY' });
    const item = f.draftItem(draft);

    expect(userA.id).not.toBe(userB.id);
    expect(userA.email).not.toBe(userB.email);
    expect(food.user_id).toBe(userA.id);
    expect(tx).toMatchObject({
      user_id: userA.id,
      category_id: food.id,
      type: 'EXPENSE',
      amount: 45000n,
      transaction_date: '2026-11-15',
      source: 'MANUAL',
      deleted_at: null,
    });
    expect(typeof jar.target_amount).toBe('bigint');
    expect(draft).toMatchObject({ batch_id: batch.id, user_id: userA.id });
    expect(item.draft_id).toBe(draft.id);
    for (const id of [userA.id, food.id, tx.id, jar.id, draft.id, item.id]) {
      expect(id).toMatch(UUID_V4);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createTestDataFactory({ clock, seed: 's1' }).user();
    const b = createTestDataFactory({ clock, seed: 's1' }).user();
    expect(a).toEqual(b);
    expect(deterministicUuid('s1', 1)).not.toBe(deterministicUuid('s2', 1));
  });

  it('can build a draft in every status', () => {
    const f = createTestDataFactory({ clock });
    const batch = f.draftBatch(f.user());
    const statuses = ALL_DRAFT_STATUSES.map(
      (status) => f.draft(batch, { status }).status,
    );
    expect(statuses).toEqual([
      'NEEDS_INPUT',
      'READY',
      'CONFIRMED',
      'CANCELLED',
      'EXPIRED',
    ]);
  });
});

describe('AI fixtures', () => {
  it('loads every fixture with a stable, unique id', () => {
    const fixtures = loadAllAiFixtures();
    expect(fixtures.size).toBeGreaterThanOrEqual(20);
    for (const [id, fixture] of fixtures) {
      expect(fixture.id).toBe(id);
      expect(fixture.expected.persists_transaction).toBe(false);
      expect(fixture.clock.timezone).toBe('Asia/Ho_Chi_Minh');
    }
  });

  it('covers every group required by test-strategy §6', () => {
    const groups = new Set(
      [...loadAllAiFixtures().values()].map((fixture) => fixture.group),
    );
    expect([...groups].sort()).toEqual([
      'adversarial',
      'chat',
      'error',
      'scan',
    ]);
  });
});

describe('FakeAIProvider', () => {
  it('returns the fixture output as raw text for the backend to validate', async () => {
    const provider = new FakeAIProvider().enqueue('chat.multiple-transactions');
    const response = await provider.parseTransactions({
      message: 'Hôm nay ăn phở 45 nghìn, cà phê 30k',
      referenceDate: '2026-11-15',
    });
    const parsed = JSON.parse(response.rawText);
    expect(parsed.transactions).toHaveLength(2);
    expect(provider.callCount).toBe(1);
    provider.assertAllConsumed();
  });

  it('returns broken model text unchanged', async () => {
    const provider = new FakeAIProvider().enqueue('error.chat-invalid-json');
    const response = await provider.parseTransactions({
      message: 'Ăn phở 45k',
      referenceDate: '2026-11-15',
    });
    expect(() => JSON.parse(response.rawText)).toThrow();
  });

  const providerErrors: Array<[string, string, number | undefined]> = [
    ['error.chat-timeout', 'timeout', undefined],
    ['error.chat-rate-limited', 'rate_limited', 429],
    ['error.chat-server-error', 'server_error', 503],
  ];

  it.each(providerErrors)('maps %s to an error', async (id, kind, status) => {
    const provider = new FakeAIProvider().enqueue(id);
    const call = provider.parseTransactions({
      message: 'Ăn phở 45k',
      referenceDate: '2026-11-15',
    });
    await expect(call).rejects.toBeInstanceOf(FakeAIProviderError);
    await expect(call).rejects.toMatchObject({ kind, httpStatus: status });
  });

  it('records the image hash, never the image bytes', async () => {
    const fixture = loadAiFixture('scan.readable');
    const image = renderSyntheticReceipt(fixture.input.image!);
    const provider = new FakeAIProvider().enqueue('scan.readable');
    await provider.analyzeReceipt(image);
    const sha = createHash('sha256').update(image).digest('hex');
    expect(provider.calls[0]).toEqual({
      method: 'analyzeReceipt',
      fixtureId: 'scan.readable',
      imageSha256: sha,
      imageBytes: image.length,
    });
  });

  it('fails loudly when misconfigured', async () => {
    const provider = new FakeAIProvider();
    await expect(
      provider.parseTransactions({ message: 'x', referenceDate: '2026-11-15' }),
    ).rejects.toThrow(/no fixture queued/);
    provider.enqueue('scan.readable');
    await expect(
      provider.parseTransactions({ message: 'x', referenceDate: '2026-11-15' }),
    ).rejects.toThrow(/expected 'chat'/);
  });
});

describe('synthetic receipt images', () => {
  const spec = loadAiFixture('scan.readable').input.image!;

  it('produces a valid PNG of the requested size', () => {
    const png = renderSyntheticReceipt(spec);
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(png.readUInt32BE(16)).toBe(spec.width);
    expect(png.readUInt32BE(20)).toBe(spec.height);
    const idatLength = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    expect(raw.length).toBe((spec.width + 1) * spec.height);
  });

  it('is deterministic and differs between specs', () => {
    const other = loadAiFixture('scan.total-mismatch').input.image!;
    expect(renderSyntheticReceipt(spec)).toEqual(renderSyntheticReceipt(spec));
    expect(renderSyntheticReceipt(spec)).not.toEqual(
      renderSyntheticReceipt(other),
    );
  });
});

describe('test database guards', () => {
  const testUrl = 'postgresql://u:secret@db.local:5432/expense_test';

  it('is disabled when TEST_DATABASE_URL is not set', () => {
    expect(resolveTestDatabaseUrl({})).toBeNull();
  });

  it('rejects the development database', () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: testUrl,
      }),
    ).toThrow(TestDatabaseConfigError);
  });

  it('rejects a database whose name does not contain "test"', () => {
    expect(() =>
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: 'postgresql://u:secret@db.local:5432/postgres',
      }),
    ).toThrow(/contains "test"/);
  });

  it('never puts the connection string in error messages', () => {
    try {
      resolveTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: testUrl,
      });
      throw new Error('expected a TestDatabaseConfigError');
    } catch (error) {
      expect(String(error)).not.toContain('secret');
      expect(String(error)).not.toContain('db.local');
    }
  });

  it('builds safe per-suite schema names', () => {
    const name = buildIsolatedSchemaName(
      'Balance Guard / IT-CONC-BAL',
      'ab12cd34',
    );
    // Slug is cut to 24 characters; PostgreSQL identifiers allow 63 bytes.
    expect(name).toMatch(/^test_balance_guard_it_conc_ba_\d+_ab12cd34$/);
    expect(name.length).toBeLessThanOrEqual(63);
  });
});
