import { View } from 'react-native';
import { Banner, Button, Checkbox, Field, Text } from '@/ui';

export type RegisterField = 'full_name' | 'email' | 'password' | 'confirm_password' | 'phone' | 'terms_accepted';

export interface RegisterFormProps {
  values: { full_name: string; email: string; password: string; confirm_password: string; phone: string; terms_accepted: boolean };
  errors: Partial<Record<RegisterField, string>>;
  formError?: string | null;
  submitting: boolean;
  onChange: (field: RegisterField, value: string | boolean) => void;
  onSubmit: () => void;
  onGoLogin: () => void;
}

export function RegisterForm({ values, errors, formError, submitting, onChange, onSubmit, onGoLogin }: RegisterFormProps) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4, marginTop: 16 }}>
        <Text variant="title">Tạo tài khoản</Text>
        <Text muted>Chỉ mất một phút</Text>
      </View>
      {formError ? <Banner message={formError} /> : null}
      <Field testID="reg-name" label="Họ và tên" value={values.full_name} onChangeText={(v) => onChange('full_name', v)} error={errors.full_name} autoComplete="name" />
      <Field testID="reg-email" label="Email" value={values.email} onChangeText={(v) => onChange('email', v)} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field testID="reg-phone" label="Số điện thoại (không bắt buộc)" value={values.phone} onChangeText={(v) => onChange('phone', v)} error={errors.phone} keyboardType="phone-pad" />
      <Field testID="reg-password" label="Mật khẩu" hint="Ít nhất 8 ký tự" value={values.password} onChangeText={(v) => onChange('password', v)} error={errors.password} secure autoComplete="new-password" />
      <Field testID="reg-confirm" label="Nhập lại mật khẩu" value={values.confirm_password} onChangeText={(v) => onChange('confirm_password', v)} error={errors.confirm_password} secure />
      <Checkbox testID="reg-terms" label="Tôi đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư" checked={values.terms_accepted} onChange={(v) => onChange('terms_accepted', v)} error={errors.terms_accepted} />
      <Button testID="reg-submit" title="Đăng ký" loading={submitting} onPress={onSubmit} />
      <Button title="Đã có tài khoản? Đăng nhập" variant="ghost" onPress={onGoLogin} />
    </View>
  );
}
