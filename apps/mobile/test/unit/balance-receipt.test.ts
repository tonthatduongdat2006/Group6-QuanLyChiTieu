// UT-FE-BAL-HINT, UT-FE-RECON, UT-FE-DRAFT
import { balanceHint, insufficientMessage, MSG_INSUFFICIENT, MSG_OPENING_NOT_SET, validateOpeningBalance } from '@/rules/balance';
import { isDraftConfirmable, receiptReconcile, receiptSum } from '@/rules/receipt';
import { isValidDate, shiftMonth, todayVN } from '@/rules/dates';

describe('UT-FE-BAL-HINT', () => {
  it('chưa thiết lập → NOT_SET; vượt số dư → INSUFFICIENT; bằng số dư → OK', () => {
    expect(balanceHint({ opening_balance_set: false, available_balance: '0' }, '1000')).toBe('NOT_SET');
    expect(balanceHint({ opening_balance_set: true, available_balance: '0' }, '1')).toBe('INSUFFICIENT');
    expect(balanceHint({ opening_balance_set: true, available_balance: '100000' }, '100000')).toBe('OK');
    expect(balanceHint({ opening_balance_set: true, available_balance: '100000' }, '100001')).toBe('INSUFFICIENT');
    expect(balanceHint(undefined, '1')).toBe('OK');
  });
  it('số lớn so sánh bằng BigInt', () => {
    expect(balanceHint({ opening_balance_set: true, available_balance: '999999999999999999' }, '999999999999999998')).toBe('OK');
  });
  it('phân biệt 2 câu thông báo CR-02 theo details.field', () => {
    expect(insufficientMessage([{ field: 'opening_balance' }])).toBe(MSG_OPENING_NOT_SET);
    expect(insufficientMessage([])).toBe(MSG_INSUFFICIENT);
    expect(MSG_OPENING_NOT_SET).toBe('Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.');
    expect(MSG_INSUFFICIENT).toBe('Số dư không đủ');
  });
  it('ô số dư ban đầu: "0" hợp lệ, rỗng/19 chữ số bị từ chối', () => {
    expect(validateOpeningBalance('0')).toBeNull();
    expect(validateOpeningBalance('5000000')).toBeNull();
    expect(validateOpeningBalance('')).not.toBeNull();
    expect(validateOpeningBalance('1'.repeat(19))).not.toBeNull();
  });
});

describe('UT-FE-RECON / UT-FE-DRAFT', () => {
  const draft = { status: 'NEEDS_INPUT', amount: '100000', category_id: 'c', transaction_date: '2026-11-10', items: [{ item_name: 'Phở', amount: '45000' }, { item_name: 'Cà phê', amount: '55000' }] };
  it('tổng các món', () => {
    expect(receiptSum(draft.items)).toBe('100000');
    expect(receiptSum([{ amount: null }])).toBeNull();
  });
  it('đối soát: khớp / lệch / thiếu', () => {
    expect(receiptReconcile('100000', draft.items)).toBe('MATCH');
    expect(receiptReconcile('100001', draft.items)).toBe('MISMATCH');
    expect(receiptReconcile('100000', [{ amount: null }])).toBe('INCOMPLETE');
    expect(receiptReconcile(null, draft.items)).toBe('INCOMPLETE');
  });
  it('chỉ xác nhận được khi đủ dữ liệu, có danh mục, tổng khớp, nháp đang chờ', () => {
    expect(isDraftConfirmable(draft)).toBe(true);
    expect(isDraftConfirmable({ ...draft, category_id: null })).toBe(false);
    expect(isDraftConfirmable({ ...draft, amount: '1' })).toBe(false);
    expect(isDraftConfirmable({ ...draft, items: [{ item_name: null, amount: '100000' }] })).toBe(false);
    expect(isDraftConfirmable({ ...draft, status: 'CONFIRMED' })).toBe(false);
  });
  it('ngày/tháng', () => {
    expect(todayVN()).toBe('2026-11-24');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
  });
});
