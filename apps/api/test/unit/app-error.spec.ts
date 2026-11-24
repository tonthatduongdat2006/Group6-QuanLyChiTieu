// Mã lỗi khớp API v1.1 §12
import { AppError, ERROR_HTTP_STATUS } from '../../src/common/errors/app-error';

describe('AppError', () => {
  it('đúng 15 mã của API v1.1 §12', () => {
    expect(Object.keys(ERROR_HTTP_STATUS)).toHaveLength(15);
    expect(Object.keys(ERROR_HTTP_STATUS)).not.toContain('DRAFT_NOT_CONFIRMABLE');
  });
  it('status theo mã', () => {
    expect(new AppError('INSUFFICIENT_BALANCE').status).toBe(422);
    expect(new AppError('IDEMPOTENCY_KEY_REUSED').status).toBe(409);
    expect(AppError.validation('amount', 'Số tiền phải lớn hơn 0').details).toEqual([
      { field: 'amount', message: 'Số tiền phải lớn hơn 0' },
    ]);
  });
});
