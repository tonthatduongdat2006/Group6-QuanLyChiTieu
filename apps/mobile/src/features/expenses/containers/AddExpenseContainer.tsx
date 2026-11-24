// Container: Rule gợi ý số dư (CR-02) + gửi khoản chi với Idempotency-Key theo ý định; server là nơi quyết định.
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { newIntentKey } from '@/api/client';
import { ApiError, toUserMessage } from '@/api/errors';
import { financeApi } from '@/api/finance';
import { useDashboard, useExpenseCategories, useInvalidateFinance } from '@/api/queries/finance';
import { balanceHint, insufficientMessage } from '@/rules/balance';
import { currentMonthVN, isValidDate, todayVN } from '@/rules/dates';
import { parseVndInput, validateAmount } from '@/rules/money';
import { Screen } from '@/ui';
import { AddExpenseForm, type AddExpenseFormProps } from '../components/AddExpenseForm';

const empty = () => ({ amount: '', categoryId: '', date: todayVN(), note: '' });

export function AddExpenseContainer() {
  const dash = useDashboard(currentMonthVN());
  const cats = useExpenseCategories();
  const invalidate = useInvalidateFinance();
  const intent = useMemo(newIntentKey, []);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<AddExpenseFormProps['errors']>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AddExpenseFormProps['saved']>(null);

  const create = useMutation({
    mutationFn: (body: Parameters<typeof financeApi.createExpense>[0]) => financeApi.createExpense(body, intent.forPayload(body)),
    onSuccess: async (tx) => {
      intent.reset();
      invalidate();
      const fresh = await dash.refetch();
      setSaved({ amount: tx.amount, balance: fresh.data?.available_balance ?? null });
      setValues((v) => ({ ...empty(), categoryId: v.categoryId }));
    },
    onError: (e) => {
      if (!(e instanceof ApiError)) return setFormError(toUserMessage(e));
      if (e.code === 'INSUFFICIENT_BALANCE') return setFormError(insufficientMessage(e.details));
      if (e.code === 'VALIDATION_ERROR') {
        const f = e.fieldErrors();
        setErrors(f);
        if (!Object.keys(f).some((k) => ['amount', 'category_id', 'transaction_date', 'note'].includes(k))) setFormError(e.message);
        return;
      }
      if (e.code === 'IDEMPOTENCY_KEY_REUSED') intent.reset();
      setFormError(toUserMessage(e));
    },
  });

  const onChange: AddExpenseFormProps['onChange'] = (field, value) => {
    setValues((v) => ({ ...v, [field]: field === 'amount' ? parseVndInput(value) : value }));
    setErrors((e) => ({ ...e, [field === 'categoryId' ? 'category_id' : field === 'date' ? 'transaction_date' : field]: undefined }));
    setFormError(null);
    setSaved(null);
  };

  const onSubmit = () => {
    if (create.isPending) return;
    const e: AddExpenseFormProps['errors'] = {};
    const a = validateAmount(values.amount);
    if (a) e.amount = a;
    if (!values.categoryId) e.category_id = 'Vui lòng chọn danh mục';
    if (!isValidDate(values.date)) e.transaction_date = 'Ngày không hợp lệ (YYYY-MM-DD)';
    setErrors(e);
    if (Object.keys(e).length) return;
    create.mutate({ amount: BigInt(values.amount).toString(), category_id: values.categoryId, transaction_date: values.date, note: values.note.trim() || null });
  };

  return (
    <Screen>
      <AddExpenseForm
        values={values}
        errors={errors}
        categories={cats.data ?? []}
        availableBalance={dash.data?.available_balance ?? null}
        hint={balanceHint(dash.data, values.amount)}
        formError={formError}
        saved={saved}
        submitting={create.isPending}
        onChange={onChange}
        onSubmit={onSubmit}
        onSetOpening={() => router.push('/opening-balance')}
      />
    </Screen>
  );
}
