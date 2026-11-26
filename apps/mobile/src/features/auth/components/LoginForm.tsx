// Presentational: chỉ props + sự kiện (không gọi API, không validate).
import { View } from 'react-native';
import { Banner, Button, Checkbox, Field, Text } from '@/ui';

export interface LoginFormProps {
  values: { email: string; password: string; rememberMe: boolean };
  /** false trên Expo Web: không hiển thị "Ghi nhớ đăng nhập" (CR-01 E-04). */
  showRememberMe: boolean;
  errors: { email?: string; password?: string };
  formError?: string | null;
  notice?: string | null;
  submitting: boolean;
  onChange: (field: 'email' | 'password' | 'rememberMe', value: string | boolean) => void;
  onSubmit: () => void;
  onGoRegister: () => void;
}

export function LoginForm({ values, showRememberMe, errors, formError, notice, submitting, onChange, onSubmit, onGoRegister }: LoginFormProps) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4, marginTop: 24 }}>
        <Text variant="title">Đăng nhập</Text>
        <Text muted>Quản lý chi tiêu thông minh cùng AI</Text>
      </View>
      {notice ? <Banner tone="info" message={notice} /> : null}
      {formError ? <Banner message={formError} /> : null}
      <Field
        testID="login-email"
        label="Email"
        value={values.email}
        onChangeText={(v) => onChange('email', v)}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        testID="login-password"
        label="Mật khẩu"
        value={values.password}
        onChangeText={(v) => onChange('password', v)}
        error={errors.password}
        secure
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={onSubmit}
      />
      {showRememberMe ? (
        <Checkbox testID="login-remember" label="Ghi nhớ đăng nhập" checked={values.rememberMe} onChange={(v) => onChange('rememberMe', v)} />
      ) : null}
      <Button testID="login-submit" title="Đăng nhập" loading={submitting} onPress={onSubmit} />
      <Button testID="go-register" title="Chưa có tài khoản? Đăng ký" variant="ghost" onPress={onGoRegister} />
    </View>
  );
}
