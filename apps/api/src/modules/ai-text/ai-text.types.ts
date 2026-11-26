export interface ParseMessageRequest {
  message: string;
  referenceDate?: string;
}

export interface ParsedMessageDraft {
  amountMinor: string;
  currency: string;
  merchantOrNote: string;
  categoryHint: string;
  occurredAt: string;
  confidence: number;
}
