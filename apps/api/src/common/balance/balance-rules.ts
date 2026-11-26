// CR-02 (D-27) + D-07 — quy tắc số dư MVP, thuần (không DB) để unit test.
// available_balance = opening_balance − Σ khoản chi đã xác nhận. Không có thu nhập/hũ trong MVP.
import { MONEY_MAX_DIGITS } from '../money/money';

/** Hai câu thông báo đã thống nhất (CR-02 §3.3) — không đổi câu chữ. */
export const MSG_OPENING_NOT_SET = 'Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi.';
export const MSG_INSUFFICIENT = 'Số dư không đủ';
export const MSG_OPENING_INVALID = 'Số dư ban đầu phải là số nguyên không âm';
export const MSG_OPENING_LOCKED = 'Không thể sửa số dư ban đầu sau khi đã có khoản chi';

export interface BalanceState {
  openingBalance: bigint;
  openingBalanceSet: boolean;
  spentTotal: bigint;
}

export function availableBalance(s: BalanceState): bigint {
  return s.openingBalance - s.spentTotal;
}

export type SpendDecision = 'OK' | 'NOT_SET' | 'INSUFFICIENT';

/** OB-6…OB-8: chưa thiết lập → NOT_SET; chi > số dư → INSUFFICIENT; chi = số dư được chấp nhận. */
export function decideSpend(s: BalanceState, amount: bigint): SpendDecision {
  if (!s.openingBalanceSet) return 'NOT_SET';
  if (amount <= 0n) throw new Error('amount phải > 0');
  return availableBalance(s) - amount >= 0n ? 'OK' : 'INSUFFICIENT';
}

/** OB-2/OB-3: chuỗi số nguyên ≥ 0, tối đa 18 chữ số. "0" hợp lệ; "-0", "01", "1.5", "1e3", " 5", "" bị từ chối. */
export function parseOpeningValue(input: unknown): bigint | null {
  if (typeof input !== 'string') return null;
  if (input === '0') return 0n;
  if (!/^[1-9][0-9]*$/.test(input) || input.length > MONEY_MAX_DIGITS) return null;
  return BigInt(input);
}
