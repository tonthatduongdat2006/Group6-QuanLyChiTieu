// Presentational: chỉ props + sự kiện.
import { View } from 'react-native';
import { AmountInput, Banner, Button, Text } from '@/ui';
import { formatVnd } from '@/utils/format';

export interface OpeningBalanceFormProps {
  digits: string;
  error: string | null;
  formError: string | null;
  currentValue: string | null;
  locked: boolean;
  submitting: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}

export function OpeningBalanceForm({ digits, error, formError, currentValue, locked, submitting, onChange, onSubmit }: OpeningBalanceFormProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text muted>
        Số tiền bạn đang có trước khi bắt đầu ghi chi tiêu. Có thể nhập 0. Bạn sửa được cho đến khi có khoản chi đầu tiên, sau đó số dư ban đầu bị khóa.
      </Text>
      {currentValue !== null ? <Text>Hiện tại: <Text style={{ fontWeight: '700' }}>{formatVnd(currentValue)}</Text></Text> : null}
      {locked ? <Banner tone="info" message="Đã có khoản chi nên số dư ban đầu đã bị khóa." /> : null}
      {formError ? <Banner message={formError} /> : null}
      <AmountInput testID="opening-amount" label="Số dư ban đầu (VND)" digits={digits} onChangeText={onChange} error={error} editable={!locked} onSubmitEditing={onSubmit} />
      <Button testID="opening-submit" title="Lưu số dư ban đầu" loading={submitting} disabled={locked} onPress={onSubmit} />
    </View>
  );
}
