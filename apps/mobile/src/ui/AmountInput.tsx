import { Field, type FieldProps } from './Field';
import { formatAmountInput } from '@/utils/format';

/** Ô nhập tiền: hiển thị "45.000", trả về chữ số thô qua onChangeDigits. Container parse/validate. */
export function AmountInput({
  digits,
  onChangeText,
  ...rest
}: Omit<FieldProps, 'value' | 'keyboardType'> & { digits: string }) {
  return (
    <Field
      keyboardType="number-pad"
      value={formatAmountInput(digits)}
      onChangeText={onChangeText}
      placeholder="0"
      {...rest}
    />
  );
}
