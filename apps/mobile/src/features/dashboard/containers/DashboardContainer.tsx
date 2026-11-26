import { router } from 'expo-router';
import { toUserMessage } from '@/api/errors';
import { useDashboard } from '@/api/queries/finance';
import { currentMonthVN } from '@/rules/dates';
import { Screen } from '@/ui';
import { formatMonthVN } from '@/utils/format';
import { DashboardView } from '../components/DashboardView';
import { toRow } from '../../expenses/containers/rows';

export function DashboardContainer() {
  const month = currentMonthVN();
  const q = useDashboard(month);
  const d = q.data;
  return (
    <Screen>
      <DashboardView
        loading={q.isLoading}
        error={q.isError ? toUserMessage(q.error) : null}
        availableBalance={d?.available_balance ?? '0'}
        openingBalance={d?.opening_balance ?? '0'}
        openingBalanceSet={d?.opening_balance_set ?? false}
        monthLabel={formatMonthVN(month)}
        monthlyExpense={d?.monthly_expense ?? '0'}
        recent={(d?.recent_transactions ?? []).map(toRow)}
        onRetry={() => void q.refetch()}
        onSetOpening={() => router.push('/opening-balance')}
        onAddExpense={() => router.push('/add')}
        onScan={() => router.push('/scan')}
        onSeeAll={() => router.push('/history')}
        onOpenTransaction={(id) => router.push({ pathname: '/transaction/[id]', params: { id } })}
      />
    </Screen>
  );
}
