// Validate đầu ra của model cho AI Scan (FR-11). Đầu ra model là dữ liệu KHÔNG tin cậy:
// - chỉ nhận đúng các trường merchant_name, transaction_date, total, items[{item_name, amount}];
// - ô không đọc được / sai định dạng → null (không đoán, không bịa);
// - mọi trường khác (vd "category", "confirm") bị bỏ qua — AI không chọn danh mục, không xác nhận.
import { parseDateOnly } from '../../common/dates/dates';
import { parseMoney } from '../../common/money/money';
import { ProviderError } from './ai-provider';

export interface ReceiptExtraction {
  merchant_name: string | null;
  transaction_date: string | null;
  total: bigint | null;
  items: { item_name: string | null; amount: bigint | null }[];
}

export const MAX_RECEIPT_ITEMS = 100;

/** JSON schema gửi cho model (structured outputs). */
export const RECEIPT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['merchant_name', 'transaction_date', 'total', 'items'],
  properties: {
    merchant_name: { type: ['string', 'null'] },
    transaction_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
    total: { type: ['string', 'null'], description: 'Số nguyên VND, chỉ chữ số' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item_name', 'amount'],
        properties: {
          item_name: { type: ['string', 'null'] },
          amount: { type: ['string', 'null'], description: 'Thành tiền của dòng, số nguyên VND, chỉ chữ số' },
        },
      },
    },
  },
} as const;

function text(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.normalize('NFC').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, max) : null;
}

function money(v: unknown): bigint | null {
  if (typeof v === 'number' && Number.isSafeInteger(v) && v > 0) return BigInt(v);
  if (typeof v !== 'string') return null;
  const r = parseMoney(v.trim());
  return r.ok ? r.value : null;
}

export function parseReceiptOutput(raw: string): ReceiptExtraction {
  let data: unknown;
  try {
    // Model đôi khi bọc JSON trong ```json … ``` — chỉ lấy phần object ngoài cùng.
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    data = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    throw new ProviderError('bad_response', 'Phản hồi AI không phải JSON hợp lệ');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ProviderError('bad_response', 'Phản hồi AI sai cấu trúc');
  const o = data as Record<string, unknown>;
  const rawItems = Array.isArray(o.items) ? o.items.slice(0, MAX_RECEIPT_ITEMS) : [];
  const date = typeof o.transaction_date === 'string' && parseDateOnly(o.transaction_date.trim()) ? o.transaction_date.trim() : null;
  return {
    merchant_name: text(o.merchant_name, 200),
    transaction_date: date,
    total: money(o.total),
    items: rawItems
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && !Array.isArray(i))
      .map((i) => ({ item_name: text(i.item_name, 200), amount: money(i.amount) }))
      .filter((i) => i.item_name !== null || i.amount !== null),
  };
}
