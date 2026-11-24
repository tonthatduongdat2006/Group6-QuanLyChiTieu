// Provider giả cho test/dev cục bộ (AI_PROVIDER=fake) — KHÔNG được bật ở production (env.ts chặn).
// Trả về hóa đơn mẫu cố định để chạy thử luồng khi không có khóa Claude; giao diện ghi rõ đây là dữ liệu mẫu.
import { Injectable } from '@nestjs/common';
import type { ReceiptAiProvider } from './ai-provider';

export const FAKE_RECEIPT_OUTPUT = {
  merchant_name: 'Cửa hàng mẫu (AI giả lập)',
  transaction_date: null,
  total: '100000',
  items: [
    { item_name: 'Phở', amount: '45000' },
    { item_name: 'Cà phê', amount: '55000' },
  ],
};

@Injectable()
export class FakeReceiptProvider implements ReceiptAiProvider {
  async analyzeReceipt(): Promise<string> {
    return JSON.stringify(FAKE_RECEIPT_OUTPUT);
  }
}
