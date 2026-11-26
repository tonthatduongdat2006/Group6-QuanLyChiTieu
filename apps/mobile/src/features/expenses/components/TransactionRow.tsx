import { Pressable, View } from 'react-native';
import { Text } from '@/ui';
import { formatDateVN, formatVnd } from '@/utils/format';
import { useTheme } from '@/theme/ThemeProvider';

export interface TransactionRowProps {
  id: string;
  categoryName: string;
  amount: string;
  date: string;
  note: string | null;
  fromReceipt: boolean;
  onPress: (id: string) => void;
}

export function TransactionRow({ id, categoryName, amount, date, note, fromReceipt, onPress }: TransactionRowProps) {
  const t = useTheme();
  return (
    <Pressable
      testID={`tx-${id}`}
      accessibilityRole="button"
      onPress={() => onPress(id)}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: t.color.border }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }}>{categoryName}{fromReceipt ? ' · Hóa đơn' : ''}</Text>
        <Text variant="caption" muted numberOfLines={1}>{formatDateVN(date)}{note ? ` · ${note}` : ''}</Text>
      </View>
      <Text color={t.color.expense} style={{ fontWeight: '700' }}>-{formatVnd(amount)}</Text>
    </Pressable>
  );
}
