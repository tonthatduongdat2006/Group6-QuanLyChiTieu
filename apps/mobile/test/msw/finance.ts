// Mock MSW cho endpoint MVP (số dư, khoản chi, AI Scan) — mô phỏng đúng quy tắc CR-02 để test Container.
import { http, HttpResponse } from 'msw';
import type { Schemas } from '@ase/contracts';

const BASE = 'http://localhost:3000/api/v1';
const NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';

type Tx = Schemas['Transaction'];
type Draft = Schemas['Draft'];

export const financeDb = {
  opening: '0',
  openingSet: false,
  txs: [] as Tx[],
  drafts: new Map<string, Draft>(),
  lastScanKey: null as string | null,
};

export const CATEGORIES: Schemas['Category'][] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Ăn uống', type: 'EXPENSE', is_default: true },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Di chuyển', type: 'EXPENSE', is_default: true },
];

export function resetFinance(opts: { opening?: string; openingSet?: boolean } = {}) {
  financeDb.opening = opts.opening ?? '0';
  financeDb.openingSet = opts.openingSet ?? false;
  financeDb.txs = [];
  financeDb.drafts.clear();
  financeDb.lastScanKey = null;
}

const spent = () => financeDb.txs.reduce((s, t) => s + BigInt(t.amount), 0n);
const available = () => (BigInt(financeDb.opening) - spent()).toString();
const err = (status: number, code: string, message: string, details?: { field?: string; message: string }[]) =>
  HttpResponse.json({ error: { code, message, request_id: 'msw', ...(details && { details }) } }, { status });

function guard(amount: string) {
  if (!financeDb.openingSet) return err(422, 'INSUFFICIENT_BALANCE', NOT_SET, [{ field: 'opening_balance', message: NOT_SET }]);
  if (BigInt(amount) > BigInt(available())) return err(422, 'INSUFFICIENT_BALANCE', 'Số dư không đủ');
  return null;
}

function addTx(amount: string, categoryId: string, date: string, note: string | null, receipt: Tx['receipt'] = null): Tx {
  const t: Tx = {
    id: `aaaaaaaa-0000-4000-8000-${String(financeDb.txs.length + 1).padStart(12, '0')}`,
    type: 'EXPENSE',
    amount,
    category: { id: categoryId, name: CATEGORIES.find((c) => c.id === categoryId)?.name ?? '?' },
    transaction_date: date,
    note,
    source: receipt ? 'AI_SCAN' : 'MANUAL',
    receipt,
    created_at: '2026-11-24T02:00:00.000Z',
    updated_at: '2026-11-24T02:00:00.000Z',
  };
  financeDb.txs.unshift(t);
  return t;
}

function revalidate(d: Draft): Draft {
  const issues: { field: string; message: string }[] = [];
  if (!d.amount) issues.push({ field: 'amount', message: 'Chưa có tổng tiền hóa đơn' });
  if (!d.transaction_date) issues.push({ field: 'transaction_date', message: 'Chưa có ngày hóa đơn' });
  if (!d.category_id) issues.push({ field: 'category_id', message: 'Vui lòng chọn danh mục' });
  const complete = d.items.length > 0 && d.items.every((i) => i.amount && i.item_name);
  if (complete && d.amount && d.items.reduce((s, i) => s + BigInt(i.amount!), 0n) !== BigInt(d.amount)) issues.push({ field: 'items', message: 'Tổng các món khác tổng hóa đơn' });
  return { ...d, validation_errors: issues, status: issues.length || !complete ? 'NEEDS_INPUT' : 'READY' };
}

export const financeHandlers = [
  http.get(`${BASE}/dashboard`, () =>
    HttpResponse.json({
      data: {
        available_balance: available(),
        opening_balance: financeDb.opening,
        opening_balance_set: financeDb.openingSet,
        monthly_income: '0',
        monthly_expense: spent().toString(),
        recent_transactions: financeDb.txs.slice(0, 5),
        budget_alerts: [],
      },
    }),
  ),
  http.put(`${BASE}/users/me/opening-balance`, async ({ request }) => {
    const { amount } = (await request.json()) as { amount: string };
    if (!/^(0|[1-9][0-9]{0,17})$/.test(amount)) return err(422, 'VALIDATION_ERROR', 'Số dư ban đầu phải là số nguyên không âm', [{ field: 'amount', message: 'Số dư ban đầu phải là số nguyên không âm' }]);
    if (financeDb.txs.length) return err(409, 'CONFLICT', 'Không thể sửa số dư ban đầu sau khi đã có khoản chi');
    financeDb.opening = amount;
    financeDb.openingSet = true;
    return HttpResponse.json({ data: { opening_balance: amount, opening_balance_set: true, locked: false } });
  }),
  http.get(`${BASE}/categories`, () => HttpResponse.json({ data: CATEGORIES })),
  http.post(`${BASE}/transactions`, async ({ request }) => {
    const b = (await request.json()) as Schemas['CreateTransactionRequest'];
    if (b.type !== 'EXPENSE') return err(422, 'VALIDATION_ERROR', 'x', [{ field: 'type', message: 'MVP chỉ hỗ trợ khoản chi' }]);
    const g = guard(b.amount);
    if (g) return g;
    return HttpResponse.json({ data: addTx(b.amount, b.category_id, b.transaction_date, b.note ?? null) }, { status: 201 });
  }),
  http.get(`${BASE}/transactions`, () =>
    HttpResponse.json({ data: financeDb.txs, meta: { page: 1, page_size: 20, total: financeDb.txs.length, total_pages: 1 } }),
  ),
  http.post(`${BASE}/ai/receipts/scan`, ({ request }) => {
    financeDb.lastScanKey = request.headers.get('idempotency-key');
    const draft: Draft = revalidate({
      id: 'dddddddd-0000-4000-8000-000000000001',
      batch_id: 'bbbbbbbb-0000-4000-8000-000000000001',
      transaction_type: 'EXPENSE',
      amount: '100000',
      category_id: null,
      transaction_date: '2026-11-10',
      note: null,
      merchant_name: 'Cửa hàng A',
      status: 'NEEDS_INPUT',
      validation_errors: [],
      transaction_id: null,
      items: [
        { id: 'iiiiiiii-0000-4000-8000-000000000001', item_name: 'Phở', amount: '45000', sort_order: 0 },
        { id: 'iiiiiiii-0000-4000-8000-000000000002', item_name: null, amount: '50000', sort_order: 1 },
      ],
    });
    financeDb.drafts.set(draft.id, draft);
    return HttpResponse.json({ data: { draft_batch: { id: draft.batch_id, source_type: 'AI_SCAN' }, draft } }, { status: 201 });
  }),
  http.get(`${BASE}/ai/drafts/:id`, ({ params }) => HttpResponse.json({ data: financeDb.drafts.get(String(params.id)) })),
  http.patch(`${BASE}/ai/drafts/:id`, async ({ params, request }) => {
    const d = financeDb.drafts.get(String(params.id))!;
    const next = revalidate({ ...d, ...((await request.json()) as Partial<Draft>) });
    financeDb.drafts.set(d.id, next);
    return HttpResponse.json({ data: next });
  }),
  http.patch(`${BASE}/ai/draft-items/:itemId`, async ({ params, request }) => {
    const body = (await request.json()) as { item_name?: string; amount?: string };
    const d = [...financeDb.drafts.values()].find((x) => x.items.some((i) => i.id === params.itemId))!;
    const next = revalidate({ ...d, items: d.items.map((i) => (i.id === params.itemId ? { ...i, ...body } : i)) });
    financeDb.drafts.set(d.id, next);
    return HttpResponse.json({ data: next });
  }),
  http.post(`${BASE}/ai/drafts/:id/confirm`, ({ params }) => {
    const d = financeDb.drafts.get(String(params.id))!;
    if (d.status !== 'READY') return err(422, 'VALIDATION_ERROR', 'Nháp chưa đủ thông tin để lưu', d.validation_errors);
    const g = guard(d.amount!);
    if (g) return g;
    const t = addTx(d.amount!, d.category_id!, d.transaction_date!, null, {
      merchant_name: d.merchant_name,
      items: d.items.map((i, idx) => ({ id: i.id, item_name: i.item_name!, amount: i.amount!, sort_order: idx })),
    });
    const confirmed = { ...d, status: 'CONFIRMED' as const, transaction_id: t.id };
    financeDb.drafts.set(d.id, confirmed);
    return HttpResponse.json({ data: { draft: confirmed, transaction: t } });
  }),
];
