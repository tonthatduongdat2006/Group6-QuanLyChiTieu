// AIProvider (M2-01) — cô lập nhà cung cấp AI khỏi nghiệp vụ. Provider chỉ trả "văn bản thô" của model;
// parse + validate (dữ liệu không tin cậy) nằm ở receipt-output.ts. Không bao giờ được gọi từ controller.

export const RECEIPT_AI_PROVIDER = Symbol('RECEIPT_AI_PROVIDER');

export interface ReceiptAiProvider {
  /** Phân tích ảnh hóa đơn, trả chuỗi JSON thô. `signal` hủy khi client ngắt kết nối. */
  analyzeReceipt(image: Buffer, mimeType: string, signal?: AbortSignal): Promise<string>;
}

export type ProviderErrorKind = 'timeout' | 'rate_limited' | 'unavailable' | 'refused' | 'aborted' | 'bad_response';

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string = kind,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
