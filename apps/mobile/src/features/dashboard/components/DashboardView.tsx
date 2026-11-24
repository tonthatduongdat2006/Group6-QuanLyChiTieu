// Presentational: Trang chủ MVP (AC-04′) — số dư, trạng thái số dư ban đầu, chi tiêu tháng, 5 khoản gần nhất.
import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, Card, Text } from '@/ui';
import { formatVnd } from '@/utils/format';
import { useTheme } from '@/theme/ThemeProvider';
import { TransactionRow, type TransactionRowProps } from '../../expenses/components/TransactionRow';

export interface DashboardViewProps {
  loading: boolean;
  error: string | null;
  availableBalance: string;
  openingBalance: string;
  openingBalanceSet: boolean;
  monthLabel: string;
  monthlyExpense: string;
  recent: Omit<TransactionRowProps, 'onPress'>[];
  onRetry: () => void;
  onSetOpening: () => void;
  onAddExpense: () => void;
  onScan: () => void;
  onSeeAll: () => void;
  onOpenTransaction: (id: string) => void;
}

export function DashboardView(p: DashboardViewProps) {
  const t = useTheme();
  if (p.loading) return <ActivityIndicator style={{ marginTop: 48 }} color={t.color.primary} accessibilityLabel="Đang tải" />;
  if (p.error) {
    return (
      <View style={{ gap: 12 }}>
        <Banner message={p.error} />
        <Button title="Thử lại" variant="secondary" onPress={p.onRetry} />
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <Text variant="title">Trang chủ</Text>
      <Card style={{ backgroundColor: t.color.primary, gap: 4 }}>
        <Text color={t.color.onPrimary} variant="caption">Số dư khả dụng</Text>
        <Text testID="available-balance" color={t.color.onPrimary} variant="money">{formatVnd(p.availableBalance)}</Text>
        <Text color={t.color.onPrimary} variant="caption">
          {p.openingBalanceSet ? `Số dư ban đầu: ${formatVnd(p.openingBalance)}` : 'Chưa thiết lập số dư ban đầu'}
        </Text>
      </Card>
      {!p.openingBalanceSet ? (
        <Card style={{ gap: 8 }}>
          <Banner tone="warning" message="Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi." />
          <Button testID="go-opening" title="Thiết lập số dư ban đầu" onPress={p.onSetOpening} />
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button testID="quick-add" title="Thêm khoản chi" onPress={p.onAddExpense} style={{ flex: 1 }} />
        <Button testID="quick-scan" title="Quét hóa đơn" variant="secondary" onPress={p.onScan} style={{ flex: 1 }} />
      </View>
      <Card style={{ gap: 4 }}>
        <Text muted variant="caption">Chi tiêu {p.monthLabel.toLowerCase()}</Text>
        <Text testID="monthly-expense" variant="heading" color={t.color.expense}>{formatVnd(p.monthlyExpense)}</Text>
      </Card>
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading">Khoản chi gần đây</Text>
          <Button testID="see-all" title="Xem tất cả" variant="ghost" onPress={p.onSeeAll} />
        </View>
        {p.recent.length === 0 ? <Text muted>Chưa có khoản chi nào.</Text> : null}
        {p.recent.map((r) => (
          <TransactionRow key={r.id} {...r} onPress={p.onOpenTransaction} />
        ))}
      </Card>
      {p.openingBalanceSet ? <Button title="Số dư ban đầu" variant="ghost" onPress={p.onSetOpening} /> : null}
    </View>
  );
}
