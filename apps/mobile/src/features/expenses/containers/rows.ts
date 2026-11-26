import type { Transaction } from '@/api/finance';
import type { TransactionRowProps } from '../components/TransactionRow';

export function toRow(t: Transaction): Omit<TransactionRowProps, 'onPress'> {
  return { id: t.id, categoryName: t.category.name, amount: t.amount, date: t.transaction_date, note: t.note, fromReceipt: !!t.receipt };
}
