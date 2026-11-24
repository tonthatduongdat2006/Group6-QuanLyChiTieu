// Quy tắc nháp hóa đơn (FR-11/FR-12, AC-22/23/25) — thuần, để unit test.
// Nháp chỉ READY khi đủ: tổng tiền, ngày, danh mục (người dùng tự chọn), ≥ 1 món đủ tên + giá, và Σ món = tổng.

export interface DraftCheckInput {
  amount: bigint | null;
  categoryId: string | null;
  transactionDate: Date | null;
  items: { itemName: string | null; amount: bigint | null }[];
}

export interface DraftIssue {
  field: string;
  message: string;
}

export interface DraftCheck {
  status: 'NEEDS_INPUT' | 'READY';
  issues: DraftIssue[];
  mismatch: boolean;
  itemsTotal: bigint | null;
}

const fmt = (v: bigint) => v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function checkDraft(d: DraftCheckInput): DraftCheck {
  const issues: DraftIssue[] = [];
  if (d.amount === null) issues.push({ field: 'amount', message: 'Chưa có tổng tiền hóa đơn' });
  if (d.transactionDate === null) issues.push({ field: 'transaction_date', message: 'Chưa có ngày hóa đơn' });
  if (d.categoryId === null) issues.push({ field: 'category_id', message: 'Vui lòng chọn danh mục' });
  if (d.items.length === 0) issues.push({ field: 'items', message: 'Hóa đơn cần ít nhất 1 món' });
  d.items.forEach((it, i) => {
    if (!it.itemName) issues.push({ field: `items[${i}].item_name`, message: 'Không đọc được tên món' });
    if (it.amount === null) issues.push({ field: `items[${i}].amount`, message: 'Không đọc được giá' });
  });
  const complete = d.items.length > 0 && d.items.every((i) => i.amount !== null);
  const itemsTotal = complete ? d.items.reduce((s, i) => s + (i.amount as bigint), 0n) : null;
  const mismatch = itemsTotal !== null && d.amount !== null && itemsTotal !== d.amount;
  if (mismatch) {
    issues.push({ field: 'items', message: `Tổng các món (${fmt(itemsTotal!)}) khác tổng hóa đơn (${fmt(d.amount!)})` });
  }
  return { status: issues.length ? 'NEEDS_INPUT' : 'READY', issues, mismatch, itemsTotal };
}
