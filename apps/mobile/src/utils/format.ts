// Định dạng hiển thị thuần (được dùng trong Presentational). Không validate ở đây.

/** "1234567" → "1.234.567 ₫" — nhóm bằng chuỗi, an toàn với số > 2^53. Hỗ trợ số âm. */
export function formatVnd(amount: string, withSymbol = true): string {
  const neg = amount.startsWith('-');
  const digits = (neg ? amount.slice(1) : amount).replace(/^0+(?=\d)/, '') || '0';
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${grouped}${withSymbol ? ' ₫' : ''}`;
}

/** Khi gõ vào ô số tiền: "45000" → "45.000" */
export function formatAmountInput(digits: string): string {
  return digits ? formatVnd(digits, false) : '';
}

/** '2026-11-24' → '24/11/2026' */
export function formatDateVN(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** '2026-11' → 'Tháng 11/2026' */
export function formatMonthVN(month: string): string {
  const [y, m] = month.split('-');
  return `Tháng ${Number(m)}/${y}`;
}
