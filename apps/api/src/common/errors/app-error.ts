// Mã lỗi đúng 15 mã của API v1.1 §12 (D-15: không tự thêm mã mới).
export const ERROR_HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  VALIDATION_ERROR: 422,
  BATCH_INVALID: 422,
  INSUFFICIENT_BALANCE: 422,
  INSUFFICIENT_JAR_BALANCE: 422,
  RECEIPT_TOTAL_MISMATCH: 422,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  AI_PROVIDER_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'Yêu cầu không hợp lệ',
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  CONFLICT: 'Dữ liệu bị trùng hoặc xung đột',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu trùng khóa nhưng nội dung khác',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  BATCH_INVALID: 'Có giao dịch nháp chưa hợp lệ, chưa lưu giao dịch nào',
  INSUFFICIENT_BALANCE: 'Số dư khả dụng không đủ',
  INSUFFICIENT_JAR_BALANCE: 'Số dư hũ không đủ',
  RECEIPT_TOTAL_MISMATCH: 'Tổng các món không khớp tổng hóa đơn',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, vui lòng thử lại sau',
  INTERNAL_SERVER_ERROR: 'Đã có lỗi xảy ra, vui lòng thử lại',
  AI_PROVIDER_ERROR: 'Trợ lý AI đang gặp sự cố, bạn có thể nhập tay',
  SERVICE_UNAVAILABLE: 'Dịch vụ tạm thời không khả dụng',
};

export interface ErrorDetail {
  field?: string;
  message: string;
  draft_id?: string;
}

/** Lỗi nghiệp vụ duy nhất được ném từ service; filter ánh xạ sang envelope `{ error: ... }`. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message?: string, details?: ErrorDetail[]) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    this.details = details;
  }

  static validation(field: string, message: string): AppError {
    return new AppError('VALIDATION_ERROR', undefined, [{ field, message }]);
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
