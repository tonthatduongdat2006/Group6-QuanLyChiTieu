// Ánh xạ mã lỗi API v1.1 §12 → thông báo tiếng Việt cho người dùng (frontend-plan §4).
export type ApiErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'IDEMPOTENCY_KEY_REUSED'
  | 'VALIDATION_ERROR' | 'BATCH_INVALID' | 'INSUFFICIENT_BALANCE' | 'INSUFFICIENT_JAR_BALANCE'
  | 'RECEIPT_TOTAL_MISMATCH' | 'RATE_LIMITED' | 'INTERNAL_SERVER_ERROR' | 'AI_PROVIDER_ERROR' | 'SERVICE_UNAVAILABLE'
  // chỉ phía client:
  | 'NETWORK_ERROR' | 'UNKNOWN';

export const ERROR_MESSAGES_VI: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  CONFLICT: 'Dữ liệu đã tồn tại',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu bị trùng, vui lòng thử lại',
  VALIDATION_ERROR: 'Vui lòng kiểm tra lại thông tin',
  BATCH_INVALID: 'Có giao dịch nháp chưa hợp lệ, chưa có giao dịch nào được lưu',
  INSUFFICIENT_BALANCE: 'Số dư khả dụng không đủ',
  INSUFFICIENT_JAR_BALANCE: 'Số dư hũ không đủ',
  RECEIPT_TOTAL_MISMATCH: 'Tổng các món chưa khớp tổng hóa đơn',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, thử lại sau ít phút',
  INTERNAL_SERVER_ERROR: 'Đã có lỗi xảy ra, vui lòng thử lại',
  AI_PROVIDER_ERROR: 'Trợ lý AI đang gặp sự cố, bạn có thể nhập tay',
  SERVICE_UNAVAILABLE: 'Hệ thống đang bận, vui lòng thử lại',
  NETWORK_ERROR: 'Không có kết nối mạng',
  UNKNOWN: 'Đã có lỗi xảy ra',
};

export interface ApiErrorDetail {
  field?: string;
  message: string;
  draft_id?: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(code: ApiErrorCode, status: number, message?: string, details: ApiErrorDetail[] = [], requestId?: string) {
    super(message || ERROR_MESSAGES_VI[code] || ERROR_MESSAGES_VI.UNKNOWN);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }

  /** Lỗi theo trường để hiển thị dưới từng ô nhập: { email: '...', password: '...' } */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const d of this.details) if (d.field && !out[d.field]) out[d.field] = d.message;
    return out;
  }

  /** Có nên thử lại cùng Idempotency-Key không (frontend-plan §5) */
  get retryable(): boolean {
    return this.code === 'NETWORK_ERROR' || this.status >= 500 || this.code === 'RATE_LIMITED';
  }
}

export function toUserMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return ERROR_MESSAGES_VI.UNKNOWN;
}
