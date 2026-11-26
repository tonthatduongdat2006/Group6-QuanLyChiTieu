// IT-OPEN-BAL, IT-BAL-GUARD (1a, 1b, 2, 12), IT-CONC-BAL, IT-TX, IT-IDEM, IT-DASH, IT-CAT-PROV + IT-CONTRACT cho endpoint M1.
import { createTestApp, parallel, resetDb, type TestContext } from '../helpers/app';
import { expectMatchesSpec } from '../helpers/contract';
import { idemKey, registerAndLogin, type TestUser } from '../helpers/factories';

const MSG_NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';
const MSG_INSUFFICIENT = 'Số dư không đủ';

describe('Số dư ban đầu + khoản chi (CR-02)', () => {
  let ctx: TestContext;
  let u: TestUser;
  let catId: string;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    u = await registerAndLogin(ctx);
    catId = (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(u.auth)).body.data[0].id;
  });

  const setOpening = (amount: unknown, user = u) => ctx.http().put('/api/v1/users/me/opening-balance').set(user.auth).send({ amount });
  const spend = (amount: string, key: string | null = idemKey(), user = u, extra: Record<string, unknown> = {}) => {
    const r = ctx.http().post('/api/v1/transactions').set(user.auth);
    if (key) r.set('Idempotency-Key', key);
    return r.send({ type: 'EXPENSE', amount, category_id: catId, transaction_date: '2026-11-24', note: 'Ăn trưa', ...extra });
  };
  const dashboard = async (user = u) => (await ctx.http().get('/api/v1/dashboard').set(user.auth).expect(200)).body.data;
  const txCount = () => ctx.prisma.transaction.count();

  describe('IT-CAT-PROV / GET /categories', () => {
    it('AC-07′: 10 danh mục chi mặc định theo thứ tự QE, đúng hợp đồng', async () => {
      const res = await ctx.http().get('/api/v1/categories?type=EXPENSE').set(u.auth);
      expectMatchesSpec('GET', '/api/v1/categories', res);
      expect(res.body.data.map((c: { name: string }) => c.name)).toEqual([
        'Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn & Tiện ích', 'Nhà ở', 'Giải trí', 'Sức khỏe', 'Giáo dục', 'Gia đình', 'Khác',
      ]);
    });
  });

  describe('IT-OPEN-BAL', () => {
    it('(1) mới đăng ký: 0, chưa thiết lập, số dư khả dụng 0', async () => {
      const res = await ctx.http().get('/api/v1/dashboard').set(u.auth);
      expectMatchesSpec('GET', '/api/v1/dashboard', res);
      expect(res.body.data).toMatchObject({ available_balance: '0', opening_balance: '0', opening_balance_set: false, monthly_income: '0', budget_alerts: [] });
    });

    it('(2) thiết lập "0" thành công', async () => {
      const res = await setOpening('0');
      expectMatchesSpec('PUT', '/api/v1/users/me/opening-balance', res);
      expect(res.body.data).toEqual({ opening_balance: '0', opening_balance_set: true, locked: false });
      expect(await dashboard()).toMatchObject({ available_balance: '0', opening_balance_set: true });
    });

    it('(3) thiết lập số dương, không tạo giao dịch nào', async () => {
      await setOpening('5000000').expect(200);
      expect(await dashboard()).toMatchObject({ available_balance: '5000000', opening_balance: '5000000' });
      expect(await txCount()).toBe(0);
    });

    it.each([['-1'], ['-0'], ['1.5'], ['1e3'], ['01'], [' 5'], [''], ['abc'], ['1'.repeat(19)], [5000]])('(4) %p bị từ chối 422, DB không đổi', async (v) => {
      await setOpening('300000').expect(200);
      const res = await setOpening(v);
      expectMatchesSpec('PUT', '/api/v1/users/me/opening-balance', res);
      expect(res.status).toBe(422);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ field: 'amount' }] });
      expect(await dashboard()).toMatchObject({ opening_balance: '300000', opening_balance_set: true });
    });

    it('CHECK DB chặn opening_balance < 0', async () => {
      await expect(ctx.prisma.$executeRawUnsafe(`UPDATE users SET opening_balance = -1 WHERE id = '${u.id}'`)).rejects.toThrow(/opening_balance_non_negative_chk/);
    });

    it('(5) sửa trước khoản chi đầu tiên: dương → 0 → dương', async () => {
      await setOpening('100000').expect(200);
      await setOpening('0').expect(200);
      await setOpening('250000').expect(200);
      expect(await dashboard()).toMatchObject({ opening_balance: '250000' });
    });

    it('(6) sau khoản chi thường: sửa bị từ chối 409, giá trị giữ nguyên', async () => {
      await setOpening('100000').expect(200);
      await spend('1000').expect(201);
      const res = await setOpening('999999');
      expectMatchesSpec('PUT', '/api/v1/users/me/opening-balance', res);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatchObject({ code: 'CONFLICT', details: [{ field: 'opening_balance' }] });
      expect(await dashboard()).toMatchObject({ opening_balance: '100000', available_balance: '99000' });
    });

    it('(8) user B không ảnh hưởng user A', async () => {
      const b = await registerAndLogin(ctx);
      await setOpening('700000', b).expect(200);
      await spend('1000', idemKey(), b, { category_id: (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(b.auth)).body.data[0].id }).expect(201);
      expect(await dashboard()).toMatchObject({ opening_balance: '0', opening_balance_set: false, available_balance: '0' });
      await setOpening('5').expect(200); // A vẫn sửa được (chưa có khoản chi của A)
    });

    it('(9) "thiết lập" và "chi" đồng thời → trạng thái cuối hợp lệ, số dư ≥ 0', async () => {
      await setOpening('50000').expect(200);
      for (let round = 0; round < 5; round++) {
        await resetDb(ctx.prisma);
        u = await registerAndLogin(ctx);
        catId = (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(u.auth)).body.data[0].id;
        await setOpening('50000').expect(200);
        const [s, t] = await Promise.all([setOpening('10000'), spend('40000')]);
        const d = await dashboard();
        expect(BigInt(d.available_balance) >= 0n).toBe(true);
        // Chỉ có 2 kết quả hợp lệ, tùy thao tác nào giữ khóa users trước:
        //  - thiết lập trước → 10.000, khoản chi 40.000 bị từ chối "Số dư không đủ";
        //  - chi trước → số dư ban đầu bị khóa (409), còn 10.000.
        const setFirst = s.status === 200 && t.status === 422 && t.body.error.message === MSG_INSUFFICIENT && d.opening_balance === '10000' && d.available_balance === '10000';
        const spendFirst = t.status === 201 && s.status === 409 && d.opening_balance === '50000' && d.available_balance === '10000';
        expect(setFirst || spendFirst).toBe(true);
      }
    });
  });

  describe('IT-BAL-GUARD', () => {
    it('(1a) chưa thiết lập + chi → 422 INSUFFICIENT_BALANCE field=opening_balance, không lưu', async () => {
      const res = await spend('1000');
      expectMatchesSpec('POST', '/api/v1/transactions', res);
      expect(res.status).toBe(422);
      expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_BALANCE', message: MSG_NOT_SET, details: [{ field: 'opening_balance', message: MSG_NOT_SET }] });
      expect(await txCount()).toBe(0);
    });
    it('(1b) thiết lập 0 + chi → "Số dư không đủ"', async () => {
      await setOpening('0').expect(200);
      const res = await spend('1');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(res.body.error.message).toBe(MSG_INSUFFICIENT);
      expect(res.body.error.details).toBeUndefined();
      expect(await txCount()).toBe(0);
    });
    it('(2) chi > số dư bị từ chối, số dư giữ nguyên', async () => {
      await setOpening('100000').expect(200);
      expect((await spend('100001')).body.error.message).toBe(MSG_INSUFFICIENT);
      expect(await dashboard()).toMatchObject({ available_balance: '100000' });
    });
    it('(12) chi bằng đúng số dư được chấp nhận (về 0), sau đó chi 1.000 bị chặn — E2E-02 ở mức API', async () => {
      await setOpening('100000').expect(200);
      const ok = await spend('100000');
      expectMatchesSpec('POST', '/api/v1/transactions', ok);
      expect(ok.status).toBe(201);
      expect(await dashboard()).toMatchObject({ available_balance: '0', monthly_expense: '100000' });
      expect((await spend('1000')).status).toBe(422);
      expect(await txCount()).toBe(1);
    });
  });

  describe('IT-CONC-BAL', () => {
    it('số dư 100.000; hai khoản 60.000 song song → đúng 1 được lưu, cuối 40.000', async () => {
      await setOpening('100000').expect(200);
      const results = await parallel(2, () => spend('60000'));
      expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
      expect(await dashboard()).toMatchObject({ available_balance: '40000' });
    });
    it('stress: 10 khoản 15.000 song song trên số dư 100.000 → đúng 6 được lưu, số dư 10.000', async () => {
      await setOpening('100000').expect(200);
      const results = await parallel(10, () => spend('15000'));
      expect(results.filter((r) => r.status === 201)).toHaveLength(6);
      expect(await dashboard()).toMatchObject({ available_balance: '10000' });
    });
  });

  describe('IT-TX', () => {
    beforeEach(async () => void (await setOpening('1000000').expect(200)));

    it('AC-06′: INCOME bị từ chối 422 (MVP chỉ khoản chi)', async () => {
      const res = await spend('1000', idemKey(), u, { type: 'INCOME' });
      expectMatchesSpec('POST', '/api/v1/transactions', res);
      expect(res.status).toBe(422);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ field: 'type', message: 'MVP chỉ hỗ trợ khoản chi' }] });
    });
    it.each([
      ['amount 0', { amount: '0' }, 'amount'],
      ['amount âm', { amount: '-5' }, 'amount'],
      ['amount thập phân', { amount: '1.5' }, 'amount'],
      ['ngày sai', { transaction_date: '2026-02-30' }, 'transaction_date'],
      ['thiếu danh mục', { category_id: null }, 'category_id'],
    ])('AC-06′: %s → 422, không lưu', async (_n, patch, field) => {
      const res = await ctx.http().post('/api/v1/transactions').set(u.auth).send({ type: 'EXPENSE', amount: '1000', category_id: catId, transaction_date: '2026-11-24', ...patch });
      expect(res.status).toBe(422);
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
      expect(await txCount()).toBe(0);
    });
    it('danh mục của user khác / danh mục thu → 422', async () => {
      const b = await registerAndLogin(ctx);
      const bCat = (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(b.auth)).body.data[0].id;
      expect((await spend('1000', idemKey(), u, { category_id: bCat })).status).toBe(422);
      const income = (await ctx.http().get('/api/v1/categories?type=INCOME').set(u.auth)).body.data[0].id;
      expect((await spend('1000', idemKey(), u, { category_id: income })).status).toBe(422);
    });
    it('AC-10′: danh sách theo tháng (mới nhất trước), phân trang, chi tiết; user khác → 404', async () => {
      await spend('1000', idemKey(), u, { transaction_date: '2026-11-01' }).expect(201);
      await spend('2000', idemKey(), u, { transaction_date: '2026-11-20' }).expect(201);
      await spend('3000', idemKey(), u, { transaction_date: '2026-10-31' }).expect(201);
      const list = await ctx.http().get('/api/v1/transactions?month=2026-11&page=1&page_size=1').set(u.auth);
      expectMatchesSpec('GET', '/api/v1/transactions', list);
      expect(list.body.meta).toEqual({ page: 1, page_size: 1, total: 2, total_pages: 2 });
      expect(list.body.data[0].amount).toBe('2000');
      const id = list.body.data[0].id;
      const detail = await ctx.http().get(`/api/v1/transactions/${id}`).set(u.auth);
      expectMatchesSpec('GET', `/api/v1/transactions/${id}`, detail);
      expect(detail.body.data).toMatchObject({ id, amount: '2000', source: 'MANUAL', receipt: null, category: { id: catId, name: 'Ăn uống' } });
      const b = await registerAndLogin(ctx);
      const other = await ctx.http().get(`/api/v1/transactions/${id}`).set(b.auth);
      expectMatchesSpec('GET', `/api/v1/transactions/${id}`, other);
      expect(other.status).toBe(404);
      expect((await ctx.http().get('/api/v1/transactions?month=2026-11').set(b.auth)).body.meta.total).toBe(0);
    });
    it('tháng sai định dạng → 422', async () => {
      expect((await ctx.http().get('/api/v1/transactions?month=2026-13').set(u.auth)).status).toBe(422);
    });
  });

  describe('IT-IDEM (POST /transactions)', () => {
    beforeEach(async () => void (await setOpening('1000000').expect(200)));
    it('cùng key + cùng payload → 1 bản ghi, trả kết quả cũ', async () => {
      const k = idemKey();
      const a = await spend('5000', k);
      const b = await spend('5000', k);
      expect([a.status, b.status]).toEqual([201, 201]);
      expect(b.body.data.id).toBe(a.body.data.id);
      expect(await txCount()).toBe(1);
    });
    it('cùng key + payload khác → 409 IDEMPOTENCY_KEY_REUSED', async () => {
      const k = idemKey();
      await spend('5000', k).expect(201);
      const res = await spend('6000', k);
      expectMatchesSpec('POST', '/api/v1/transactions', res);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });
    it('song song cùng key → 1 bản ghi', async () => {
      const k = idemKey();
      const rs = await parallel(5, () => spend('5000', k));
      expect(rs.every((r) => r.status === 201)).toBe(true);
      expect(new Set(rs.map((r) => r.body.data.id)).size).toBe(1);
      expect(await txCount()).toBe(1);
    });
    it('bị từ chối vì số dư không làm key bị coi là đã dùng', async () => {
      const k = idemKey();
      await spend('2000000', k).expect(422);
      await spend('5000', k).expect(201);
    });
  });

  describe('IT-DASH', () => {
    it('AC-04′: số dư, chi tháng, 5 khoản gần nhất', async () => {
      await setOpening('1000000').expect(200);
      for (let i = 1; i <= 6; i++) await spend(String(i * 1000), idemKey(), u, { transaction_date: `2026-11-${String(i).padStart(2, '0')}` }).expect(201);
      await spend('9000', idemKey(), u, { transaction_date: '2026-10-15' }).expect(201);
      const res = await ctx.http().get('/api/v1/dashboard?month=2026-11').set(u.auth);
      expectMatchesSpec('GET', '/api/v1/dashboard', res);
      expect(res.body.data).toMatchObject({ available_balance: '970000', opening_balance: '1000000', opening_balance_set: true, monthly_income: '0', monthly_expense: '21000', budget_alerts: [] });
      expect(res.body.data.recent_transactions.map((t: { amount: string }) => t.amount)).toEqual(['6000', '5000', '4000', '3000', '2000']);
    });
  });
});
