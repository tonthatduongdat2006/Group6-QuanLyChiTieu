import { ParsedMessageDraft } from '../../../../packages/contracts/src/ai-text';

function toBigIntString(value: bigint): string {
  return value < 0n ? '0' : value.toString();
}

export function parseExpenseMessage(
  rawMessage: string,
  referenceDateIso: string = new Date().toISOString().slice(0, 10)
): ParsedMessageDraft {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  let amount = 0n;

  // Hỗ trợ triệu / tr (ví dụ: 1.5tr, 2 triệu)
  const millionMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(tr|triệu)\b/);
  // Hỗ trợ k / nghìn / ngàn (ví dụ: 40k, 25.5 nghìn)
  const thousandMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn)\b/);
  // Hỗ trợ số nguyên có hoặc không có dấu phân cách hàng nghìn (ví dụ: 40000, 40.000)
  const plainMatch = lower.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d{4,})\b/);

  if (millionMatch) {
    const clean = millionMatch[1].replace(',', '.');
    const [intPart, decPart = ''] = clean.split('.');
    const scale = BigInt(decPart.length);
    const combined = BigInt(intPart + decPart);
    const factor = 1_000_000n;
    const divisor = 10n ** scale;
    amount = (combined * factor) / divisor;
  } else if (thousandMatch) {
    const clean = thousandMatch[1].replace(',', '.');
    const [intPart, decPart = ''] = clean.split('.');
    const scale = BigInt(decPart.length);
    const combined = BigInt(intPart + decPart);
    const factor = 1_000n;
    const divisor = 10n ** scale;
    amount = (combined * factor) / divisor;
  } else if (plainMatch) {
    amount = BigInt(plainMatch[1].replace(/[.,]/g, ''));
  }

  let categoryHint = 'Khác';
  if (/(ăn|sáng|trưa|tối|cà phê|cafe|trà sữa|bún|phở|cơm|nhậu)/i.test(lower)) {
    categoryHint = 'Ăn uống';
  } else if (/(grab|xe|xăng|gửi xe|vé|taxi|di chuyển|buýt)/i.test(lower)) {
    categoryHint = 'Di chuyển';
  } else if (/(mua|áo|quần|giày|shopee|lazada|tiki|siêu thị)/i.test(lower)) {
    categoryHint = 'Mua sắm';
  } else if (/(điện|nước|wifi|internet|nhà|hóa đơn|thuê)/i.test(lower)) {
    categoryHint = 'Hóa đơn';
  } else if (/(phim|game|giải trí|du lịch|xem)/i.test(lower)) {
    categoryHint = 'Giải trí';
  } else if (/(sách|học|khóa học|tài liệu|học phí)/i.test(lower)) {
    categoryHint = 'Học tập';
  } else if (/(thuốc|khám|bệnh viện|nha khoa|gym|sức khỏe)/i.test(lower)) {
    categoryHint = 'Sức khỏe';
  }

  let occurredAt = referenceDateIso;
  if (/hôm qua/i.test(lower)) {
    const d = new Date(`${referenceDateIso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    occurredAt = d.toISOString().slice(0, 10);
  }

  const merchantOrNote =
    message
      .replace(/(\d+(?:[.,]\d+)?)\s*(tr|triệu|k|nghìn|ngàn|đ|vnd)?/gi, '')
      .replace(/\bhôm qua\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || categoryHint;

  return {
    amountMinor: toBigIntString(amount),
    currency: 'VND',
    merchantOrNote,
    categoryHint,
    occurredAt,
    confidence: amount > 0n ? 0.85 : 0.4,
  };
}
