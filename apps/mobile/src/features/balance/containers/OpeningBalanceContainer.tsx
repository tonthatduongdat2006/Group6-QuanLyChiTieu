// Container: dùng ở màn riêng và trong hộp thoại của trình sửa nháp hóa đơn (M2-04).
import { useState } from 'react';
import { ApiError, toUserMessage } from '@/api/errors';
import { useDashboard, useSetOpeningBalance } from '@/api/queries/finance';
import { validateOpeningBalance } from '@/rules/balance';
import { currentMonthVN } from '@/rules/dates';
import { parseVndInput } from '@/rules/money';
import { OpeningBalanceForm } from '../components/OpeningBalanceForm';

export function OpeningBalanceContainer({ onDone }: { onDone?: () => void }) {
  const dash = useDashboard(currentMonthVN());
  const save = useSetOpeningBalance();
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const d = dash.data;
  const locked = !!d && d.opening_balance_set && d.recent_transactions.length > 0;

  const onSubmit = () => {
    if (save.isPending) return;
    const e = validateOpeningBalance(digits);
    setError(e);
    if (e) return;
    save.mutate(digits === '' ? '0' : BigInt(digits).toString(), {
      onSuccess: () => {
        setDigits('');
        onDone?.();
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') setError(err.fieldErrors().amount ?? err.message);
        else setFormError(toUserMessage(err));
      },
    });
  };

  return (
    <OpeningBalanceForm
      digits={digits}
      error={error}
      formError={formError}
      currentValue={d?.opening_balance_set ? d.opening_balance : null}
      locked={locked}
      submitting={save.isPending}
      onChange={(text) => {
        setDigits(parseVndInput(text));
        setError(null);
        setFormError(null);
      }}
      onSubmit={onSubmit}
    />
  );
}
