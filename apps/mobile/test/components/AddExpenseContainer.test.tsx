// IT-FE-CONTAINER (M1): thêm khoản chi với MSW — 2 thông báo CR-02, chi bằng số dư được lưu.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AddExpenseContainer } from '@/features/expenses/containers/AddExpenseContainer';
import { renderWithProviders } from '../render';
import { installMockFetch } from '../msw/installFetch';
import { financeDb, resetFinance } from '../msw/finance';

let restore: () => void;
beforeEach(() => (restore = installMockFetch()));
afterEach(() => restore());

const fillAndSubmit = async (amount: string) => {
  fireEvent.changeText(screen.getByTestId('expense-amount'), amount);
  fireEvent.press(await screen.findByText('Ăn uống'));
  fireEvent.press(screen.getByTestId('expense-submit'));
};

describe('AddExpenseContainer', () => {
  it('chưa thiết lập số dư: gợi ý + server từ chối với đúng câu CR-02, không lưu', async () => {
    resetFinance();
    renderWithProviders(<AddExpenseContainer />);
    expect(await screen.findAllByText('Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.')).toHaveLength(1);
    await fillAndSubmit('1000');
    await waitFor(() => expect(screen.getAllByText('Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.').length).toBeGreaterThanOrEqual(2));
    expect(financeDb.txs).toHaveLength(0);
  });

  it('số dư 0 → "Số dư không đủ", không lưu', async () => {
    resetFinance({ opening: '0', openingSet: true });
    renderWithProviders(<AddExpenseContainer />);
    await fillAndSubmit('1000');
    await waitFor(() => expect(screen.getAllByText('Số dư không đủ').length).toBeGreaterThanOrEqual(1));
    expect(financeDb.txs).toHaveLength(0);
  });

  it('chi bằng đúng số dư được lưu, hiển thị thông báo thành công', async () => {
    resetFinance({ opening: '100000', openingSet: true });
    renderWithProviders(<AddExpenseContainer />);
    await screen.findByText('Số dư khả dụng: 100.000 ₫');
    await fillAndSubmit('100.000');
    expect(await screen.findByText('Đã lưu khoản chi 100.000 ₫.')).toBeTruthy();
    expect(financeDb.txs).toHaveLength(1);
    expect(financeDb.txs[0]).toMatchObject({ amount: '100000', type: 'EXPENSE', transaction_date: '2026-11-24' });
  });

  it('validate phía client: thiếu số tiền / danh mục → không gọi API', async () => {
    resetFinance({ opening: '100000', openingSet: true });
    renderWithProviders(<AddExpenseContainer />);
    fireEvent.press(await screen.findByTestId('expense-submit'));
    expect(await screen.findByText('Vui lòng nhập số tiền')).toBeTruthy();
    expect(screen.getByText('Vui lòng chọn danh mục')).toBeTruthy();
    expect(financeDb.txs).toHaveLength(0);
  });
});
