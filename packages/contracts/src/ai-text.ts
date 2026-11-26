export type ParsedMessageDraft = {
  amountMinor: string; // Luôn là chuỗi số nguyên (ví dụ "40000" cho 40.000đ)
  currency: 'VND';
  merchantOrNote: string;
  categoryHint: string;
  occurredAt: string; // ISO date YYYY-MM-DD
  confidence: number;
};

export type ParseMessageRequest = {
  message: string;
  referenceDate?: string;
};
