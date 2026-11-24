import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { authApi } from '@/api/auth';
import { ApiError, toUserMessage } from '@/api/errors';
import { hasErrors, validateRegisterForm, type RegisterForm as RegisterValues } from '@/rules/validation';
import { Screen } from '@/ui';
import { RegisterForm, type RegisterFormProps } from '../components/RegisterForm';

const empty: RegisterValues = { full_name: '', email: '', password: '', confirm_password: '', phone: '', terms_accepted: false };

export function RegisterContainer() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<RegisterFormProps['errors']>({});
  const [formError, setFormError] = useState<string | null>(null);

  const register = useMutation({
    mutationFn: () =>
      authApi.register({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone.trim() || null,
        terms_accepted: values.terms_accepted as true,
      }),
    onSuccess: (user) => router.replace({ pathname: '/login', params: { email: user.email, registered: '1' } }),
    onError: (e) => {
      if (e instanceof ApiError && (e.code === 'VALIDATION_ERROR' || e.code === 'CONFLICT') && e.details.length) {
        setErrors(e.fieldErrors());
      } else {
        setFormError(toUserMessage(e));
      }
    },
  });

  const onChange: RegisterFormProps['onChange'] = (field, value) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setFormError(null);
  };

  const onSubmit = () => {
    if (register.isPending) return;
    const v = validateRegisterForm(values);
    setErrors(v);
    if (!hasErrors(v)) register.mutate();
  };

  return (
    <Screen>
      <RegisterForm
        values={values}
        errors={errors}
        formError={formError}
        submitting={register.isPending}
        onChange={onChange}
        onSubmit={onSubmit}
        onGoLogin={() => router.back()}
      />
    </Screen>
  );
}
