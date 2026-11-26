// Presentational: form thêm khoản chi (AC-05′/06′). Không validate, không gọi API.
import { View } from 'react-native';
import { AmountInput, Banner, Button, Card, Chip, Field, Text } from '@/ui';
import { formatVnd } from '@/utils/format';
import { useTheme } from '@/theme/ThemeProvider';

export interface AddExpenseFormProps {
  values: { amount: string; categoryId: string; date: string; note: string };
  errors: { amount?: string; category_id?: string; transaction_date?: string; note?: string };
  categories: { id: string; name: string }[];
  availableBalance: string | null;
  hint: 'OK' | 'NOT_SET' | 'INSUFFICIENT';
  formError: string | null;
  saved: { amount: string; balance: string | null } | null;
  submitting: boolean;
  onChange: (field: 'amount' | 'categoryId' | 'date' | 'note', value: string) => void;
  onSubmit: () => void;
  onSetOpening: () => void;
}

export function AddExpenseForm(p: AddExpenseFormProps) {
  const t = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">Thêm khoản chi</Text>
      {p.availableBalance !== null ? <Text muted>Số dư khả dụng: {formatVnd(p.availableBalance)}</Text> : null}
      {p.saved ? <Banner tone="info" message={`Đã lưu khoản chi ${formatVnd(p.saved.amount)}.`} /> : null}
      {p.hint === 'NOT_SET' ? (
        <Card style={{ gap: 8 }}>
          <Banner tone="warning" message="Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi." />
          <Button testID="add-go-opening" title="Thiết lập số dư ban đầu" variant="secondary" onPress={p.onSetOpening} />
        </Card>
      ) : null}
      {p.hint === 'INSUFFICIENT' ? <Banner tone="warning" message="Số dư không đủ" /> : null}
      {p.formError ? <Banner message={p.formError} /> : null}
      <AmountInput testID="expense-amount" label="Số tiền (VND)" digits={p.values.amount} onChangeText={(v) => p.onChange('amount', v)} error={p.errors.amount} />
      <View style={{ gap: 6 }}>
        <Text variant="caption" style={{ fontWeight: '600' }}>Danh mục</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={p.values.categoryId === c.id} onPress={() => p.onChange('categoryId', c.id)} />
          ))}
        </View>
        {p.errors.category_id ? <Text variant="caption" color={t.color.danger}>{p.errors.category_id}</Text> : null}
      </View>
      <Field testID="expense-date" label="Ngày (YYYY-MM-DD)" value={p.values.date} onChangeText={(v) => p.onChange('date', v)} error={p.errors.transaction_date} autoCapitalize="none" />
      <Field testID="expense-note" label="Ghi chú (không bắt buộc)" value={p.values.note} onChangeText={(v) => p.onChange('note', v)} error={p.errors.note} maxLength={500} />
      <Button testID="expense-submit" title="Lưu khoản chi" loading={p.submitting} onPress={p.onSubmit} />
    </View>
  );
}
