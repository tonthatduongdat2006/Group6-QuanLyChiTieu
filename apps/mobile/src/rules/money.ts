// P1-FE-05 — Rule tiền VND phía client. KHÔNG dùng Number cho số tiền (frontend-plan §1).
// Biên API: chuỗi số nguyên dương ("45000").

const DIGITS = /^[0-9]+$/;
export const MONEY_MAX_DIGITS = 18;

/** Chuỗi người dùng gõ ("45.000", "45 000", "45000đ") → chuỗi chữ số ("45000"); rỗng nếu không có số. */
export function parseVndInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

/** Lỗi tiếng Việt hoặc null. Nhận chuỗi chữ số đã parse. */
export function validateAmount(value: string): string | null {
  if (!value) return 'Vui lòng nhập số tiền';
  if (!DIGITS.test(value)) return 'Số tiền không hợp lệ';
  if (/^0+$/.test(value)) return 'Số tiền phải lớn hơn 0';
  if (value.replace(/^0+/, '').length > MONEY_MAX_DIGITS) return 'Số tiền vượt giới hạn cho phép';
  return null;
}

/** So sánh 2 chuỗi tiền không dấu bằng BigInt (cho gợi ý UX, server vẫn quyết định). */
export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const x = BigInt(a || '0');
  const y = BigInt(b || '0');
  return x < y ? -1 : x > y ? 1 : 0;
}
