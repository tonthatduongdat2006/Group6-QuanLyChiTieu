export interface ParseMessageRequest {
  message: string;
  referenceDate?: string;
}

export interface ParsedMessageDraft {
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  type?: 'expense' | 'income';
  date?: string;
  confidence?: number;
}
