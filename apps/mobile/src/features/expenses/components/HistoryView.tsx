import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, Card, Text } from '@/ui';
import { formatVnd } from '@/utils/format';
import { TransactionRow, type TransactionRowProps } from './TransactionRow';

export interface HistoryViewProps {
  monthLabel: string;
  rows: Omit<TransactionRowProps, 'onPress'>[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onLoadMore: () => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}

export function HistoryView(p: HistoryViewProps) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button testID="prev-month" title="‹ Trước" variant="ghost" onPress={p.onPrevMonth} />
        <Text variant="heading">{p.monthLabel}</Text>
        <Button testID="next-month" title="Sau ›" variant="ghost" onPress={p.onNextMonth} />
      </View>
      {p.loading ? <ActivityIndicator accessibilityLabel="Đang tải" /> : null}
      {p.error ? (
        <View style={{ gap: 8 }}>
          <Banner message={p.error} />
          <Button title="Thử lại" variant="secondary" onPress={p.onRetry} />
        </View>
      ) : null}
      {!p.loading && !p.error ? (
        <Card>
          <Text muted variant="caption">{p.total} khoản chi</Text>
          {p.rows.length === 0 ? <Text muted>Không có khoản chi trong tháng này.</Text> : null}
          {p.rows.map((r) => (
            <TransactionRow key={r.id} {...r} onPress={p.onOpen} />
          ))}
        </Card>
      ) : null}
      {p.hasMore ? <Button title="Tải thêm" variant="secondary" loading={p.loadingMore} onPress={p.onLoadMore} /> : null}
    </View>
  );
}

export interface TransactionDetailViewProps {
  loading: boolean;
  error: string | null;
  tx: {
    amount: string;
    categoryName: string;
    date: string;
    note: string | null;
    sourceLabel: string;
    merchant: string | null;
    items: { id: string; name: string; amount: string }[] | null;
  } | null;
}

export function TransactionDetailView({ loading, error, tx }: TransactionDetailViewProps) {
  if (loading) return <ActivityIndicator accessibilityLabel="Đang tải" />;
  if (error || !tx) return <Banner message={error ?? 'Không tìm thấy khoản chi'} />;
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 6 }}>
        <Text variant="money">-{formatVnd(tx.amount)}</Text>
        <Text>{tx.categoryName}</Text>
        <Text muted>{tx.date} · {tx.sourceLabel}</Text>
        {tx.note ? <Text>Ghi chú: {tx.note}</Text> : null}
      </Card>
      {tx.items ? (
        <Card style={{ gap: 6 }}>
          <Text variant="heading">Hóa đơn{tx.merchant ? ` · ${tx.merchant}` : ''}</Text>
          {tx.items.map((i) => (
            <View key={i.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1 }}>{i.name}</Text>
              <Text>{formatVnd(i.amount)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
