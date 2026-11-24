import { useState } from 'react';
import { router } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { useTransaction, useTransactions } from '@/api/queries/finance';
import { currentMonthVN, shiftMonth } from '@/rules/dates';
import { Screen } from '@/ui';
import { formatDateVN, formatMonthVN } from '@/utils/format';
import { HistoryView, TransactionDetailView } from '../components/HistoryView';
import { toRow } from './rows';

export function HistoryContainer() {
  const [month, setMonth] = useState(currentMonthVN());
  const q = useTransactions(month);
  const pages = q.data?.pages ?? [];
  return (
    <Screen>
      <HistoryView
        monthLabel={formatMonthVN(month)}
        rows={pages.flatMap((p) => p.items).map(toRow)}
        total={pages[0]?.meta.total ?? 0}
        loading={q.isLoading}
        error={q.isError ? toUserMessage(q.error) : null}
        hasMore={!!q.hasNextPage}
        loadingMore={q.isFetchingNextPage}
        onPrevMonth={() => setMonth((m) => shiftMonth(m, -1))}
        onNextMonth={() => setMonth((m) => shiftMonth(m, 1))}
        onLoadMore={() => void q.fetchNextPage()}
        onOpen={(id) => router.push({ pathname: '/transaction/[id]', params: { id } })}
        onRetry={() => void q.refetch()}
      />
    </Screen>
  );
}

const SOURCE: Record<string, string> = { MANUAL: 'Nhập tay', AI_SCAN: 'Quét hóa đơn', AI_CHAT: 'Trợ lý AI' };

export function TransactionDetailContainer({ id }: { id: string }) {
  const q = useTransaction(id);
  const t = q.data;
  return (
    <Screen>
      <TransactionDetailView
        loading={q.isLoading}
        error={q.isError ? toUserMessage(q.error) : null}
        tx={
          t
            ? {
                amount: t.amount,
                categoryName: t.category.name,
                date: formatDateVN(t.transaction_date),
                note: t.note,
                sourceLabel: SOURCE[t.source] ?? t.source,
                merchant: t.receipt?.merchant_name ?? null,
                items: t.receipt ? t.receipt.items.map((i, idx) => ({ id: i.id ?? String(idx), name: i.item_name, amount: i.amount })) : null,
              }
            : null
        }
      />
    </Screen>
  );
}
