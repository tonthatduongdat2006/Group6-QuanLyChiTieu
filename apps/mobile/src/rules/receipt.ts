// Nháp hóa đơn phía client (UT-FE-DRAFT, UT-FE-RECON): đối soát tổng bằng BigInt; server vẫn là nơi quyết định.
export interface DraftLike {
  status: string;
  amount: string | null;
  category_id: string | null;
  transaction_date: string | null;
  items: { item_name: string | null; amount: string | null }[];
}

/** Tổng các món; null nếu còn món chưa có giá. */
export function receiptSum(items: { amount: string | null }[]): string | null {
  if (items.some((i) => !i.amount)) return null;
  return items.reduce((s, i) => s + BigInt(i.amount!), 0n).toString();
}

export type ReconState = 'MATCH' | 'MISMATCH' | 'INCOMPLETE';

export function receiptReconcile(total: string | null, items: { amount: string | null }[]): ReconState {
  const sum = receiptSum(items);
  if (!total || sum === null || items.length === 0) return 'INCOMPLETE';
  return BigInt(sum) === BigInt(total) ? 'MATCH' : 'MISMATCH';
}

/** Có thể bấm "Xác nhận lưu" chưa: đủ dữ liệu, đã chọn danh mục, tổng khớp, nháp đang chờ. */
export function isDraftConfirmable(d: DraftLike): boolean {
  if (d.status !== 'READY' && d.status !== 'NEEDS_INPUT') return false;
  if (!d.amount || !d.category_id || !d.transaction_date) return false;
  if (d.items.some((i) => !i.item_name || !i.amount)) return false;
  return receiptReconcile(d.amount, d.items) === 'MATCH';
}
