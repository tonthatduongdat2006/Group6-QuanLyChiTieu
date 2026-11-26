import type { AiDraft, AiDraftItem } from '@prisma/client';
import { formatDateOnly } from '../../common/dates/dates';

export type DraftWithItems = AiDraft & { items: AiDraftItem[] };

export function toDraftDto(d: DraftWithItems) {
  const issues = Array.isArray(d.validationErrors) ? (d.validationErrors as { field: string; message: string }[]) : [];
  return {
    id: d.id,
    batch_id: d.batchId,
    transaction_type: d.transactionType,
    amount: d.amount === null ? null : d.amount.toString(),
    category_id: d.categoryId,
    transaction_date: d.transactionDate ? formatDateOnly(d.transactionDate) : null,
    note: d.note,
    merchant_name: d.merchantName,
    status: d.status,
    validation_errors: issues,
    transaction_id: d.transactionId,
    items: [...d.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ id: i.id, item_name: i.itemName, amount: i.amount === null ? null : i.amount.toString(), sort_order: i.sortOrder })),
  };
}
