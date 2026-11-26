// IT-SCHEMA (P1-BE-01) — ràng buộc DB chạy trên PostgreSQL thật. Bản đầy đủ hơn: test/sql/it-schema.sql (pnpm test:sql).
import { Prisma } from '@prisma/client';
import { createTestApp, resetDb, type TestContext } from '../helpers/app';
import { registerAndLogin } from '../helpers/factories';

async function expectDbError(p: Promise<unknown>, pgCode: string) {
  try {
    await p;
  } catch (e) {
    const msg = String((e as Error).message);
    const meta = (e as Prisma.PrismaClientKnownRequestError).meta as { code?: string } | undefined;
    if (meta?.code === pgCode || msg.includes(pgCode) || (pgCode === '23505' && (e as { code?: string }).code === 'P2002') ||
        (pgCode === '23503' && (e as { code?: string }).code === 'P2003')) return;
    throw new Error(`Sai loại lỗi, mong đợi ${pgCode}: ${msg}`);
  }
  throw new Error(`Lẽ ra DB phải từ chối (${pgCode})`);
}

describe('IT-SCHEMA', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx.prisma));

  it('đủ 14 bảng', async () => {
    const rows = await ctx.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`;
    expect(Number(rows[0].n)).toBe(14);
  });

  it('14 cột idempotency trên đúng 6 bảng (D-05)', async () => {
    const rows = await ctx.prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND (column_name LIKE '%idempotency_key' OR column_name LIKE '%request_hash')
      ORDER BY table_name, column_name`;
    expect(rows.length).toBe(14);
    expect(new Set(rows.map((r) => r.table_name))).toEqual(
      new Set(['transactions', 'saving_jars', 'jar_transactions', 'ai_messages', 'ai_draft_batches', 'ai_drafts']),
    );
  });

  it('amount ≤ 0, category người khác, lệch type, trùng budget, 2 receipt/tx đều bị DB chặn', async () => {
    const a = await registerAndLogin(ctx);
    const b = await registerAndLogin(ctx);
    const aFood = await ctx.prisma.category.findFirstOrThrow({ where: { userId: a.id, type: 'EXPENSE' } });
    const aSalary = await ctx.prisma.category.findFirstOrThrow({ where: { userId: a.id, type: 'INCOME' } });
    const bFood = await ctx.prisma.category.findFirstOrThrow({ where: { userId: b.id, type: 'EXPENSE' } });
    const tx = (over: Partial<Prisma.TransactionUncheckedCreateInput>) =>
      ctx.prisma.transaction.create({
        data: { userId: a.id, categoryId: aSalary.id, type: 'INCOME', amount: 1000n, transactionDate: new Date('2026-11-01'), source: 'MANUAL', ...over },
      });

    await expectDbError(tx({ amount: 0n }), '23514');
    await expectDbError(tx({ amount: -1n }), '23514');
    await expectDbError(tx({ categoryId: bFood.id, type: 'EXPENSE' }), '23503');
    await expectDbError(tx({ categoryId: aFood.id, type: 'INCOME' }), '23503');

    const ok = await tx({});
    await ctx.prisma.receiptDetails.create({ data: { transactionId: ok.id } });
    await expectDbError(ctx.prisma.receiptDetails.create({ data: { transactionId: ok.id } }), '23505');
    // D-12b: không xóa cứng giao dịch có receipt
    await expectDbError(ctx.prisma.transaction.delete({ where: { id: ok.id } }), '23503');

    const budget = { userId: a.id, categoryId: aFood.id, monthStart: new Date('2026-11-01'), limitAmount: 100n };
    await ctx.prisma.budget.create({ data: budget });
    await expectDbError(ctx.prisma.budget.create({ data: budget }), '23505');
    await expectDbError(ctx.prisma.budget.create({ data: { ...budget, monthStart: new Date('2026-12-15') } }), '23514');
  });
});
