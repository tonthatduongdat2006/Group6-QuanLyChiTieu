// Hook server-state cho MVP. Chỉ invalidate SAU khi server báo thành công.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../finance';
import { qk } from './keys';

export const useDashboard = (month: string) => useQuery({ queryKey: qk.dashboard(month), queryFn: () => financeApi.dashboard(month) });
export const useExpenseCategories = () => useQuery({ queryKey: qk.categories('EXPENSE'), queryFn: financeApi.expenseCategories, staleTime: 5 * 60_000 });
export const useTransaction = (id: string) => useQuery({ queryKey: qk.transaction(id), queryFn: () => financeApi.getTransaction(id) });

export function useTransactions(month: string) {
  return useInfiniteQuery({
    queryKey: qk.transactions(month),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => financeApi.listTransactions(month, pageParam),
    getNextPageParam: (last) => (last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined),
  });
}

/** Sau khi số dư thay đổi (thiết lập số dư / thêm khoản chi / xác nhận hóa đơn). */
export function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.dashboardAll });
    void qc.invalidateQueries({ queryKey: qk.transactionsAll });
  };
}

export function useSetOpeningBalance() {
  const invalidate = useInvalidateFinance();
  return useMutation({ mutationFn: (amount: string) => financeApi.setOpeningBalance(amount), onSuccess: invalidate });
}
