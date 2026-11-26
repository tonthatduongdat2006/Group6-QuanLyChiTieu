// Ánh xạ Transaction (Prisma) → schema `Transaction` của OpenAPI. Tiền luôn là chuỗi.
import type { Category, ReceiptDetails, ReceiptItem, Transaction } from '@prisma/client';
import { formatDateOnly } from '../../common/dates/dates';

export type TransactionWithRelations = Transaction & {
  category: Pick<Category, 'id' | 'name'>;
  receiptDetails?: (ReceiptDetails & { items: ReceiptItem[] }) | null;
};

export const TRANSACTION_INCLUDE = {
  category: { select: { id: true, name: true } },
  receiptDetails: { include: { items: { orderBy: { sortOrder: 'asc' as const } } } },
};

export function toTransactionDto(t: TransactionWithRelations) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount.toString(),
    category: { id: t.category.id, name: t.category.name },
    transaction_date: formatDateOnly(t.transactionDate),
    note: t.note,
    source: t.source,
    receipt: t.receiptDetails
      ? {
          merchant_name: t.receiptDetails.merchantName,
          items: t.receiptDetails.items.map((i) => ({ id: i.id, item_name: i.itemName, amount: i.amount.toString(), sort_order: i.sortOrder })),
        }
      : null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}
