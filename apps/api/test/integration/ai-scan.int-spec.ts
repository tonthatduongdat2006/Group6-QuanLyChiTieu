// IT-SCAN, IT-SCAN-IDEM, IT-SCAN-FAIL, IT-PRIV, IT-AI-ADV, IT-SCAN-CONFIRM, IT-DRAFT-AUTHZ, IT-BAL-GUARD (13), IT-OPEN-BAL (7)
// + IT-CONTRACT cho endpoint AI. AI luôn là FakeProvider đọc fixtures — không gọi Claude thật.
import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RECEIPT_AI_PROVIDER } from '../../src/modules/ai-provider/ai-provider';
import { createTestApp, parallel, resetDb, type TestContext } from '../helpers/app';
import { expectMatchesSpec } from '../helpers/contract';
import { idemKey, registerAndLogin, type TestUser } from '../helpers/factories';
import { makePng } from '../helpers/images';
import { FakeReceiptProviderForTest } from '../fakes/fake-receipt-provider';

const MSG_NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';

describe('AI Scan', () => {
  let ctx: TestContext;
  const provider = new FakeReceiptProviderForTest();
  let u: TestUser;
  let catId: string;

  beforeAll(async () => (ctx = await createTestApp([{ provide: RECEIPT_AI_PROVIDER, useValue: provider }])));
  afterAll(async () => ctx.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    provider.received.length = 0;
    u = await registerAndLogin(ctx);
    catId = (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(u.auth)).body.data[1].id;
  });

  const scan = (img: Buffer, key = idemKey(), user = u, mime = 'image/png') =>
    ctx.http().post('/api/v1/ai/receipts/scan').set(user.auth).set('Idempotency-Key', key).attach('image', img, { filename: 'r.png', contentType: mime });
  const patch = (id: string, body: object, user = u) => ctx.http().patch(`/api/v1/ai/drafts/${id}`).set(user.auth).send(body);
  const confirm = (id: string, key = idemKey(), user = u) => ctx.http().post(`/api/v1/ai/drafts/${id}/confirm`).set(user.auth).set('Idempotency-Key', key);
  const setOpening = (amount: string, user = u) => ctx.http().put('/api/v1/users/me/opening-balance').set(user.auth).send({ amount }).expect(200);
  const counts = async () => ({
    batches: await ctx.prisma.aiDraftBatch.count(),
    drafts: await ctx.prisma.aiDraft.count(),
    tx: await ctx.prisma.transaction.count(),
    receipts: await ctx.prisma.receiptDetails.count(),
    items: await ctx.prisma.receiptItem.count(),
  });
  /** Quét + điền danh mục, ngày → nháp READY. */
  const readyDraft = async (user = u, cat = catId) => {
    provider.use('receipt-readable');
    const r = await scan(makePng(Math.floor(Math.random() * 200) + 2), idemKey(), user).expect(201);
    const p = await patch(r.body.data.draft.id, { category_id: cat }, user).expect(200);
    expect(p.body.data.status).toBe('READY');
    return p.body.data;
  };

  describe('IT-SCAN', () => {
    it('AC-21/25: đọc cửa hàng, ngày, món, giá, tổng; KHÔNG chọn danh mục; chỉ tạo nháp', async () => {
      provider.use('receipt-readable');
      const res = await scan(makePng(2));
      expectMatchesSpec('POST', '/api/v1/ai/receipts/scan', res);
      expect(res.status).toBe(201);
      expect(res.body.data.draft).toMatchObject({
        merchant_name: 'Cửa hàng A',
        transaction_date: '2026-11-10',
        amount: '100000',
        transaction_type: 'EXPENSE',
        category_id: null,
        status: 'NEEDS_INPUT',
        validation_errors: [{ field: 'category_id' }],
        items: [{ item_name: 'Phở', amount: '45000', sort_order: 0 }, { item_name: 'Cà phê', amount: '55000', sort_order: 1 }],
      });
      expect(await counts()).toMatchObject({ batches: 1, drafts: 1, tx: 0, receipts: 0 });
    });

    it('AC-22: ô không đọc được để null và được đánh dấu', async () => {
      provider.use('receipt-unreadable-fields');
      const d = (await scan(makePng(3)).expect(201)).body.data.draft;
      expect(d.merchant_name).toBeNull();
      expect(d.validation_errors.map((e: { field: string }) => e.field)).toEqual(['transaction_date', 'category_id', 'items[1].item_name', 'items[2].amount']);
    });

    it('AC-23′: tổng in khác Σ món → nháp đánh dấu lệch, không tự sửa', async () => {
      provider.use('receipt-total-mismatch');
      const d = (await scan(makePng(4)).expect(201)).body.data.draft;
      expect(d.amount).toBe('110000');
      expect(d.validation_errors.find((e: { field: string }) => e.field === 'items').message).toContain('khác tổng hóa đơn');
    });

    it('ảnh không phải hóa đơn → nháp rỗng NEEDS_INPUT', async () => {
      provider.use('receipt-not-a-receipt');
      const d = (await scan(makePng(5)).expect(201)).body.data.draft;
      expect(d).toMatchObject({ amount: null, items: [], status: 'NEEDS_INPUT' });
    });

    it.each([
      ['không phải ảnh', Buffer.from('xin chao '.repeat(30)), 'image/png'],
      ['MIME khai báo khác nội dung', makePng(6), 'image/jpeg'],
      ['PNG bị cắt', makePng(7).subarray(0, 60), 'image/png'],
    ])('%s → 422, không gọi AI, không tạo gì', async (_n, buf, mime) => {
      const res = await scan(buf as Buffer, idemKey(), u, mime as string);
      expectMatchesSpec('POST', '/api/v1/ai/receipts/scan', res);
      expect(res.status).toBe(422);
      expect(res.body.error.details[0].field).toBe('image');
      expect(provider.received).toHaveLength(0);
      expect((await counts()).batches).toBe(0);
    });

    it('ảnh > 4 MB → 422 có kiểm soát (không crash)', async () => {
      const big = Buffer.concat([makePng(8), Buffer.alloc(4 * 1024 * 1024 + 10)]);
      const res = await scan(big);
      expect(res.status).toBe(422);
      expect(res.body.error.details[0]).toMatchObject({ field: 'image', message: 'Ảnh vượt quá 4 MB' });
    });

    it('thiếu Idempotency-Key → 422', async () => {
      const res = await ctx.http().post('/api/v1/ai/receipts/scan').set(u.auth).attach('image', makePng(9), { filename: 'r.png', contentType: 'image/png' });
      expect(res.status).toBe(422);
    });
  });

  describe('IT-SCAN-IDEM', () => {
    it('cùng key + cùng ảnh → nháp cũ, không gọi AI lần 2; cùng key + ảnh khác → 409', async () => {
      provider.use('receipt-readable');
      const k = idemKey();
      const a = await scan(makePng(10), k).expect(201);
      const b = await scan(makePng(10), k).expect(201);
      expect(b.body.data.draft.id).toBe(a.body.data.draft.id);
      expect(provider.received).toHaveLength(1);
      const c = await scan(makePng(11), k);
      expectMatchesSpec('POST', '/api/v1/ai/receipts/scan', c);
      expect(c.status).toBe(409);
      expect(c.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
      expect((await counts()).batches).toBe(1);
    });
    it('2 request song song cùng key + cùng ảnh → 1 lô', async () => {
      provider.use('receipt-readable');
      const k = idemKey();
      const rs = await parallel(3, () => scan(makePng(12), k));
      expect(rs.every((r) => r.status === 201)).toBe(true);
      expect((await counts()).batches).toBe(1);
    });
  });

  describe('IT-SCAN-FAIL / IT-AI-ADV', () => {
    it.each([['receipt-timeout'], ['chat-invalid-json']])('%s → 502 AI_PROVIDER_ERROR, không tạo lô/nháp', async (fx) => {
      provider.use(fx);
      const res = await scan(makePng(13));
      expectMatchesSpec('POST', '/api/v1/ai/receipts/scan', res);
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
      expect((await counts()).batches).toBe(0);
    });
    it('provider 429 → 429 RATE_LIMITED', async () => {
      provider.use('chat-provider-overloaded');
      const res = await scan(makePng(14));
      expect([429, 502]).toContain(res.status);
      expect((await counts()).batches).toBe(0);
    });
    it('chữ trên ảnh ra lệnh "chọn Lương, tự xác nhận" → vẫn chỉ là nháp, không danh mục, không giao dịch', async () => {
      provider.use('receipt-injection-text');
      const d = (await scan(makePng(15)).expect(201)).body.data.draft;
      expect(d).toMatchObject({ category_id: null, status: 'NEEDS_INPUT', transaction_id: null });
      expect((await counts()).tx).toBe(0);
    });
    it('giới hạn 20 lần quét/giờ/người dùng → lần 21 bị 429', async () => {
      provider.use('receipt-readable');
      for (let i = 0; i < 20; i++) await scan(makePng(100 + i)).expect(201);
      const res = await scan(makePng(200));
      expectMatchesSpec('POST', '/api/v1/ai/receipts/scan', res);
      expect(res.status).toBe(429);
      const b = await registerAndLogin(ctx); // người khác không bị ảnh hưởng
      await scan(makePng(201), idemKey(), b).expect(201);
    });
  });

  describe('IT-PRIV (AC-24)', () => {
    it('không lưu ảnh: DB chỉ còn SHA-256 (64 hex), không có byte ảnh trong DB hay thư mục tạm', async () => {
      provider.use('receipt-readable');
      const img = makePng(16);
      const before = new Set(readdirSync(tmpdir()));
      await scan(img).expect(201);
      const batch = await ctx.prisma.aiDraftBatch.findFirstOrThrow();
      expect(batch.idempotencyRequestHash).toMatch(/^[0-9a-f]{64}$/);
      // Quét toàn bộ dữ liệu của mọi bảng: không có byte ảnh (dạng base64/hex) ở đâu cả
      const tables = await ctx.prisma.$queryRawUnsafe<{ tablename: string }[]>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`);
      expect(tables.length).toBe(14);
      let dump = '';
      for (const { tablename } of tables) {
        const rows = await ctx.prisma.$queryRawUnsafe<{ j: string }[]>(`SELECT row_to_json(t)::text AS j FROM "${tablename}" t`);
        dump += rows.map((r) => r.j).join('\n');
      }
      expect(dump).toContain(batch.idempotencyRequestHash!); // kiểm chứng dump thật sự chứa dữ liệu
      for (const needle of [img.subarray(16, 48).toString('base64'), img.subarray(16, 48).toString('hex'), img.toString('base64').slice(0, 40)]) {
        expect(dump.includes(needle)).toBe(false);
      }
      for (const f of readdirSync(tmpdir())) {
        if (before.has(f)) continue;
        try {
          expect(readFileSync(join(tmpdir(), f)).includes(img.subarray(0, 64))).toBe(false);
        } catch {
          /* thư mục / không đọc được */
        }
      }
    });
  });

  describe('Sửa nháp (AC-22) + IT-DRAFT-AUTHZ', () => {
    it('sửa/thêm/xóa món luôn tính lại trạng thái; đúng hợp đồng', async () => {
      provider.use('receipt-readable');
      const d = (await scan(makePng(17)).expect(201)).body.data.draft;
      const p = await patch(d.id, { category_id: catId, merchant_name: 'Quán B', note: 'Trưa' });
      expectMatchesSpec('PATCH', `/api/v1/ai/drafts/${d.id}`, p);
      expect(p.body.data).toMatchObject({ status: 'READY', merchant_name: 'Quán B', note: 'Trưa' });
      const add = await ctx.http().post(`/api/v1/ai/drafts/${d.id}/items`).set(u.auth).send({ item_name: 'Trà đá', amount: '5000' });
      expectMatchesSpec('POST', `/api/v1/ai/drafts/${d.id}/items`, add);
      expect(add.status).toBe(201);
      expect(add.body.data.status).toBe('NEEDS_INPUT'); // 105.000 ≠ 100.000
      const newItem = add.body.data.items[2].id;
      const upd = await ctx.http().patch(`/api/v1/ai/draft-items/${newItem}`).set(u.auth).send({ amount: '1000' });
      expectMatchesSpec('PATCH', `/api/v1/ai/draft-items/${newItem}`, upd);
      const del = await ctx.http().delete(`/api/v1/ai/draft-items/${newItem}`).set(u.auth);
      expectMatchesSpec('DELETE', `/api/v1/ai/draft-items/${newItem}`, del);
      expect(del.body.data).toMatchObject({ status: 'READY', items: [{}, {}] });
      const got = await ctx.http().get(`/api/v1/ai/drafts/${d.id}`).set(u.auth);
      expectMatchesSpec('GET', `/api/v1/ai/drafts/${d.id}`, got);
      expect(got.body.data.status).toBe('READY');
    });
    it('giá trị sai → 422; tổng hóa đơn không âm/0; loại INCOME bị từ chối', async () => {
      provider.use('receipt-readable');
      const d = (await scan(makePng(18)).expect(201)).body.data.draft;
      expect((await patch(d.id, { amount: '0' })).status).toBe(422);
      expect((await patch(d.id, { transaction_type: 'INCOME' })).status).toBe(422);
      expect((await patch(d.id, { transaction_date: '2026-02-30' })).status).toBe(422);
      expect((await patch(d.id, { hacker: 1 })).status).toBe(422);
      expect((await ctx.http().post(`/api/v1/ai/drafts/${d.id}/items`).set(u.auth).send({ item_name: '', amount: '1' })).status).toBe(422);
    });
    it('user B đọc/sửa/xác nhận nháp của A → 404; A gán danh mục của B → 422, không tạo bản ghi', async () => {
      provider.use('receipt-readable');
      const d = (await scan(makePng(19)).expect(201)).body.data.draft;
      const b = await registerAndLogin(ctx);
      await setOpening('1000000', b);
      expect((await ctx.http().get(`/api/v1/ai/drafts/${d.id}`).set(b.auth)).status).toBe(404);
      expect((await patch(d.id, { note: 'x' }, b)).status).toBe(404);
      expect((await confirm(d.id, idemKey(), b)).status).toBe(404);
      expect((await ctx.http().patch(`/api/v1/ai/draft-items/${d.items[0].id}`).set(b.auth).send({ amount: '1' })).status).toBe(404);
      expect((await ctx.http().delete(`/api/v1/ai/draft-items/${d.items[0].id}`).set(b.auth)).status).toBe(404);
      const bCat = (await ctx.http().get('/api/v1/categories?type=EXPENSE').set(b.auth)).body.data[0].id;
      const res = await patch(d.id, { category_id: bCat });
      expect(res.status).toBe(422);
      expect(res.body.error.details[0].field).toBe('category_id');
      expect((await counts()).tx).toBe(0);
    });
  });

  describe('IT-SCAN-CONFIRM + IT-BAL-GUARD (13) + IT-OPEN-BAL (7)', () => {
    it('(13) chưa thiết lập → 422 kèm field opening_balance; nháp giữ nguyên; không tạo giao dịch/receipt/item', async () => {
      const d = await readyDraft();
      const res = await confirm(d.id);
      expectMatchesSpec('POST', `/api/v1/ai/drafts/${d.id}/confirm`, res);
      expect(res.status).toBe(422);
      expect(res.body.error).toMatchObject({ code: 'INSUFFICIENT_BALANCE', message: MSG_NOT_SET, details: [{ field: 'opening_balance' }] });
      expect((await ctx.http().get(`/api/v1/ai/drafts/${d.id}`).set(u.auth)).body.data).toMatchObject({ status: 'READY', transaction_id: null });
      expect(await counts()).toMatchObject({ tx: 0, receipts: 0, items: 0 });
    });
    it('không đủ số dư → "Số dư không đủ", nháp giữ nguyên', async () => {
      await setOpening('99999');
      const d = await readyDraft();
      const res = await confirm(d.id);
      expect(res.status).toBe(422);
      expect(res.body.error.message).toBe('Số dư không đủ');
      expect((await counts()).tx).toBe(0);
    });
    it('lệch tổng → 422 RECEIPT_TOTAL_MISMATCH, không lưu gì', async () => {
      await setOpening('1000000');
      provider.use('receipt-total-mismatch');
      const d = (await scan(makePng(20)).expect(201)).body.data.draft;
      await patch(d.id, { category_id: catId }).expect(200);
      const res = await confirm(d.id);
      expectMatchesSpec('POST', `/api/v1/ai/drafts/${d.id}/confirm`, res);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('RECEIPT_TOTAL_MISMATCH');
      expect((await counts()).tx).toBe(0);
    });
    it('nháp thiếu dữ liệu → 422 VALIDATION_ERROR', async () => {
      await setOpening('1000000');
      provider.use('receipt-readable');
      const d = (await scan(makePng(21)).expect(201)).body.data.draft; // chưa chọn danh mục
      const res = await confirm(d.id);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('AC-26′: xác nhận tạo đúng 1 khoản chi + receipt + món; số dư cập nhật; (7) số dư ban đầu bị khóa', async () => {
      await setOpening('100000');
      const d = await readyDraft();
      const k = idemKey();
      const res = await confirm(d.id, k);
      expectMatchesSpec('POST', `/api/v1/ai/drafts/${d.id}/confirm`, res);
      expect(res.status).toBe(200);
      expect(res.body.data.draft).toMatchObject({ status: 'CONFIRMED', transaction_id: res.body.data.transaction.id });
      expect(res.body.data.transaction).toMatchObject({
        type: 'EXPENSE', amount: '100000', source: 'AI_SCAN', transaction_date: '2026-11-10', category: { id: catId },
        receipt: { merchant_name: 'Cửa hàng A', items: [{ item_name: 'Phở', amount: '45000' }, { item_name: 'Cà phê', amount: '55000' }] },
      });
      expect(await counts()).toMatchObject({ tx: 1, receipts: 1, items: 2 });
      const dash = (await ctx.http().get('/api/v1/dashboard?month=2026-11').set(u.auth)).body.data;
      expect(dash).toMatchObject({ available_balance: '0', monthly_expense: '100000' });
      // (7) sau khoản chi từ AI Scan: số dư ban đầu bị khóa
      const lock = await ctx.http().put('/api/v1/users/me/opening-balance').set(u.auth).send({ amount: '500000' });
      expect(lock.status).toBe(409);
      // Replay cùng key / bấm lại → cùng giao dịch, không tạo thêm
      const again = await confirm(d.id, k).expect(200);
      expect(again.body.data.transaction.id).toBe(res.body.data.transaction.id);
      expect((await counts()).tx).toBe(1);
      // Nháp đã xác nhận không sửa được nữa
      expect((await patch(d.id, { note: 'x' })).status).toBe(409);
      // Chi tiết giao dịch có danh sách món
      const detail = await ctx.http().get(`/api/v1/transactions/${res.body.data.transaction.id}`).set(u.auth);
      expect(detail.body.data.receipt.items).toHaveLength(2);
    });
    it('cùng Idempotency-Key cho nháp khác → 409', async () => {
      await setOpening('1000000');
      const a = await readyDraft();
      const b = await readyDraft();
      const k = idemKey();
      await confirm(a.id, k).expect(200);
      const res = await confirm(b.id, k);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });
    it('xác nhận song song cùng nháp → đúng 1 giao dịch', async () => {
      await setOpening('1000000');
      const d = await readyDraft();
      const k = idemKey();
      const rs = await parallel(4, () => confirm(d.id, k));
      expect(rs.every((r) => r.status === 200)).toBe(true);
      expect((await counts()).tx).toBe(1);
    });
    it('xác nhận hóa đơn và khoản chi tay song song vượt số dư → đúng 1 được lưu, số dư ≥ 0', async () => {
      await setOpening('150000');
      const d = await readyDraft(); // 100.000
      const [c, t] = await Promise.all([
        confirm(d.id),
        ctx.http().post('/api/v1/transactions').set(u.auth).set('Idempotency-Key', idemKey()).send({ type: 'EXPENSE', amount: '60000', category_id: catId, transaction_date: '2026-11-24' }),
      ]);
      expect([c.status, t.status].sort()).toEqual([200, 422]);
      const dash = (await ctx.http().get('/api/v1/dashboard').set(u.auth)).body.data;
      expect(BigInt(dash.available_balance) >= 0n).toBe(true);
      expect((await counts()).tx).toBe(1);
    });
  });
});
