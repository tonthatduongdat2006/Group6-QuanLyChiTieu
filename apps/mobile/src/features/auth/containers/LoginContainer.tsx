// Container: điều phối state form, Rule validate, gọi API, ánh xạ lỗi. Không tự vẽ UI phức tạp.
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/api/auth';
import { supportsRememberMe } from '@/api/capabilities';
import { ApiError, toUserMessage } from '@/api/errors';
import { hasErrors, validateLoginForm } from '@/rules/validation';
import { Screen } from '@/ui';
import { LoginForm, type LoginFormProps } from '../components/LoginForm';

export function LoginContainer() {
  const params = useLocalSearchParams<{ email?: string; registered?: string }>();
  const [values, setValues] = useState({ email: params.email ?? '', password: '', rememberMe: false });
  const [errors, setErrors] = useState<LoginFormProps['errors']>({});
  const [formError, setFormError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: () => authApi.login({ email: values.email.trim(), password: values.password, remember_me: supportsRememberMe && values.rememberMe }),
    // Thành công: SessionManager đổi trạng thái → layout gốc tự chuyển sang (tabs)
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR') setErrors(e.fieldErrors());
      else setFormError(toUserMessage(e));
    },
  });

  const onChange: LoginFormProps['onChange'] = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(null);
  };

  const onSubmit = () => {
    if (login.isPending) return;
    const v = validateLoginForm(values);
    setErrors(v);
    if (!hasErrors(v)) login.mutate();
  };

  return (
    <Screen>
      <LoginForm
        values={values}
        showRememberMe={supportsRememberMe}
        errors={errors}
        formError={formError}
        notice={params.registered ? 'Đăng ký thành công, mời bạn đăng nhập' : null}
        submitting={login.isPending}
        onChange={onChange}
        onSubmit={onSubmit}
        onGoRegister={() => router.push('/register')}
      />
    </Screen>
  );
}
