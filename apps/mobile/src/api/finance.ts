// API MVP (19 endpoint core): số dư ban đầu, dashboard, danh mục, khoản chi, AI Scan + nháp. Kiểu lấy từ OpenAPI.
import type { Schemas } from '@ase/contracts';
import { http } from './client';

export type Dashboard = Schemas['Dashboard'];
export type Category = Schemas['Category'];
export type Transaction = Schemas['Transaction'];
export type Draft = Schemas['Draft'];
export type ScanResult = Schemas['ScanResult'];
export type OpeningBalance = Schemas['OpeningBalance'];
export type PageMeta = Schemas['PageMeta'];

export interface NewExpense {
  amount: string;
  category_id: string;
  transaction_date: string;
  note: string | null;
}

export const financeApi = {
  dashboard: async (month?: string) => (await http.get<Dashboard>('/dashboard', { query: { month } })).data,
  setOpeningBalance: async (amount: string) => (await http.put<OpeningBalance>('/users/me/opening-balance', { amount })).data,
  expenseCategories: async () => (await http.get<Category[]>('/categories', { query: { type: 'EXPENSE' } })).data,
  createExpense: async (body: NewExpense, idempotencyKey: string) =>
    (await http.post<Transaction>('/transactions', { type: 'EXPENSE', ...body }, { idempotencyKey })).data,
  listTransactions: async (month: string, page: number) => {
    const r = await http.get<Transaction[]>('/transactions', { query: { month, page, page_size: 20, type: 'EXPENSE' } });
    return { items: r.data, meta: r.meta! };
  },
  getTransaction: async (id: string) => (await http.get<Transaction>(`/transactions/${encodeURIComponent(id)}`)).data,

  scanReceipt: async (image: Blob, idempotencyKey: string, signal?: AbortSignal) => {
    const form = new FormData();
    form.append('image', image, image.type === 'image/png' ? 'receipt.png' : 'receipt.jpg');
    return (await http.post<ScanResult>('/ai/receipts/scan', form, { idempotencyKey, signal })).data;
  },
  getDraft: async (id: string) => (await http.get<Draft>(`/ai/drafts/${id}`)).data,
  updateDraft: async (id: string, body: Schemas['UpdateDraftRequest']) => (await http.patch<Draft>(`/ai/drafts/${id}`, body)).data,
  addDraftItem: async (id: string, body: { item_name: string; amount: string }) => (await http.post<Draft>(`/ai/drafts/${id}/items`, body)).data,
  updateDraftItem: async (itemId: string, body: Schemas['DraftItemInput']) => (await http.patch<Draft>(`/ai/draft-items/${itemId}`, body)).data,
  deleteDraftItem: async (itemId: string) => (await http.delete<Draft>(`/ai/draft-items/${itemId}`)).data,
  confirmDraft: async (id: string, idempotencyKey: string) =>
    (await http.post<Schemas['ConfirmDraftResult']>(`/ai/drafts/${id}/confirm`, undefined, { idempotencyKey })).data,
};
