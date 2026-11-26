// P1-BE-03 — Tiền VND: số nguyên dương, BIGINT trong DB, chuỗi ở biên API (API v1.1 §1.2).
// Không bao giờ đi qua Number để tránh mất chính xác.

/** Tối đa 18 chữ số: luôn < 2^63-1 (giới hạn BIGINT của PostgreSQL). */
export const MONEY_MAX_DIGITS = 18;
const POSITIVE = /^[1-9][0-9]*$/;

export type MoneyParseError = 'NOT_A_STRING' | 'INVALID_FORMAT' | 'NOT_POSITIVE' | 'TOO_LARGE';

export type MoneyResult = { ok: true; value: bigint } | { ok: false; error: MoneyParseError };

export const MONEY_ERROR_MESSAGES: Record<MoneyParseError, string> = {
  NOT_A_STRING: 'Số tiền phải là chuỗi số nguyên',
  INVALID_FORMAT: 'Số tiền phải là số nguyên, không có dấu, phần thập phân hay số 0 ở đầu',
  NOT_POSITIVE: 'Số tiền phải lớn hơn 0',
  TOO_LARGE: 'Số tiền vượt giới hạn cho phép',
};

/** Parse tiền dương. Từ chối "0", "-1", "1.5", "1e3", "007", " 5", "+5", số > 18 chữ số. */
export function parseMoney(input: unknown): MoneyResult {
  if (typeof input !== 'string') return { ok: false, error: 'NOT_A_STRING' };
  if (input === '0') return { ok: false, error: 'NOT_POSITIVE' };
  if (/^-[0-9]+$/.test(input)) return { ok: false, error: 'NOT_POSITIVE' };
  if (!POSITIVE.test(input)) return { ok: false, error: 'INVALID_FORMAT' };
  if (input.length > MONEY_MAX_DIGITS) return { ok: false, error: 'TOO_LARGE' };
  return { ok: true, value: BigInt(input) };
}

/** Như parseMoney nhưng cho phép "0" (vd `initial_deposit`). */
export function parseMoneyOrZero(input: unknown): MoneyResult {
  if (input === '0') return { ok: true, value: 0n };
  return parseMoney(input);
}

/** BigInt → chuỗi cho JSON. Cho phép số âm (vd `remaining_amount`, `net_change`). */
export function moneyToString(value: bigint): string {
  return value.toString();
}

/** BigInt có dấu → luôn ≥ 0? Dùng cho guard. */
export function isNonNegative(value: bigint): boolean {
  return value >= 0n;
}
