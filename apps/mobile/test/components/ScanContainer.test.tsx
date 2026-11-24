// IT-FE-CONTAINER (M2): luồng AI Scan với MSW — nháp, banner lệch tổng, ô không đọc được, hộp thoại số dư, xác nhận.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ScanContainer } from '@/features/scan/containers/ScanContainer';
import { renderWithProviders } from '../render';
import { installMockFetch } from '../msw/installFetch';
import { financeDb, resetFinance } from '../msw/finance';

const mockRelease = jest.fn();
jest.mock('@/api/receiptImage', () => ({
  ImagePickError: class extends Error {},
  pickReceiptImage: jest.fn(async () => ({ blob: new Blob(['x'], { type: 'image/jpeg' }), previewUrl: 'blob:test', release: mockRelease })),
}));

let restore: () => void;
beforeEach(() => {
  restore = installMockFetch();
  mockRelease.mockClear();
});
afterEach(() => restore());

describe('ScanContainer', () => {
  it('quét → nháp (chưa lưu gì) → sửa ô thiếu + lệch tổng → chưa thiết lập số dư thì bị chặn + hộp thoại → thiết lập → xác nhận lưu', async () => {
    resetFinance();
    renderWithProviders(<ScanContainer />);
    fireEvent.press(screen.getByTestId('scan-pick'));
    expect(await screen.findByText('Kiểm tra bản nháp')).toBeTruthy();
    expect(mockRelease).toHaveBeenCalled(); // ảnh được dọn khỏi bộ nhớ ngay sau khi tải lên
    expect(financeDb.lastScanKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(financeDb.txs).toHaveLength(0); // quét chỉ tạo nháp
    expect(screen.getByText('Không đọc được tên món')).toBeTruthy();
    expect(screen.getByTestId('recon-mismatch')).toBeTruthy(); // 45.000 + 50.000 ≠ 100.000

    fireEvent.changeText(screen.getByTestId('item-name-1'), 'Cà phê');
    fireEvent.changeText(screen.getByTestId('item-amount-1'), '55.000');
    fireEvent.press(screen.getByText('Ăn uống'));
    await waitFor(() => expect(screen.queryByTestId('recon-mismatch')).toBeNull());

    fireEvent.press(screen.getByTestId('draft-confirm'));
    expect(await screen.findAllByText('Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.')).not.toHaveLength(0);
    expect(financeDb.txs).toHaveLength(0);
    expect(financeDb.drafts.get('dddddddd-0000-4000-8000-000000000001')?.status).toBe('READY'); // nháp giữ nguyên

    // Hộp thoại thiết lập số dư ngay trong trình sửa nháp
    fireEvent.changeText(await screen.findByTestId('opening-amount'), '200000');
    fireEvent.press(screen.getByTestId('opening-submit'));
    expect(await screen.findByText('Đã thiết lập số dư ban đầu. Bấm “Xác nhận lưu” để lưu hóa đơn.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('draft-confirm'));
    expect(await screen.findByText('Đã lưu khoản chi')).toBeTruthy();
    expect(financeDb.txs).toHaveLength(1);
    expect(financeDb.txs[0]).toMatchObject({ amount: '100000', source: 'AI_SCAN', receipt: { merchant_name: 'Cửa hàng A' } });
    expect(financeDb.txs[0]!.receipt!.items.map((i) => i.item_name)).toEqual(['Phở', 'Cà phê']);
  });

  it('nút "Xác nhận lưu" bị khóa khi chưa chọn danh mục', async () => {
    resetFinance({ opening: '500000', openingSet: true });
    renderWithProviders(<ScanContainer />);
    fireEvent.press(screen.getByTestId('scan-pick'));
    await screen.findByText('Kiểm tra bản nháp');
    fireEvent.changeText(screen.getByTestId('item-name-1'), 'Cà phê');
    fireEvent.changeText(screen.getByTestId('item-amount-1'), '55000');
    expect(screen.getByTestId('draft-confirm')).toBeDisabled();
    fireEvent.press(screen.getByText('Ăn uống'));
    await waitFor(() => expect(screen.getByTestId('draft-confirm')).toBeEnabled());
    expect(financeDb.txs).toHaveLength(0);
  });
});
