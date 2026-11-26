// CR-02 phía client: chỉ là GỢI Ý UX (server vẫn quyết định qua BalanceGuard). TS thuần — không import React/RN/api.
import { compareMoney } from './money';

/** Hai câu thông báo đã thống nhất (CR-02 §3.3) — dùng nguyên văn. */
export const MSG_OPENING_NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';
export const MSG_INSUFFICIENT = 'Số dư không đủ';

export type BalanceHint = 'OK' | 'NOT_SET' | 'INSUFFICIENT';

/** Gợi ý trước khi gửi: chưa thiết lập / vượt số dư khả dụng. `amount` là chuỗi chữ số đã parse. */
export function balanceHint(state: { opening_balance_set: boolean; available_balance: string } | undefined, amount: string): BalanceHint {
  if (!state) return 'OK'; // chưa tải xong dashboard → để server quyết định
  if (!state.opening_balance_set) return 'NOT_SET';
  if (amount && compareMoney(amount, state.available_balance) > 0) return 'INSUFFICIENT';
  return 'OK';
}

/** Lỗi INSUFFICIENT_BALANCE của server → câu thông báo đúng CR-02 (phân biệt bằng details[].field). */
export function insufficientMessage(details: { field?: string }[]): string {
  return details.some((d) => d.field === 'opening_balance') ? MSG_OPENING_NOT_SET : MSG_INSUFFICIENT;
}

/** Ô nhập số dư ban đầu: chuỗi chữ số đã parse, "0" hợp lệ. */
export function validateOpeningBalance(digits: string): string | null {
  if (digits === '') return 'Vui lòng nhập số dư ban đầu (có thể là 0)';
  if (!/^[0-9]+$/.test(digits)) return 'Số dư ban đầu phải là số nguyên không âm';
  if (digits.replace(/^0+(?=\d)/, '').length > 18) return 'Số dư vượt giới hạn cho phép';
  return null;
}
