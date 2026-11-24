import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppError } from '../errors/app-error';
import { normalizeClientKey } from '../idempotency/idempotency';

/**
 * Đọc header Idempotency-Key.
 * `@IdempotencyKey(true)` → bắt buộc (AI message, scan, confirm, confirm-all); thiếu/sai → 422.
 * `@IdempotencyKey()` → tùy chọn; có nhưng sai định dạng → 422; không có → null.
 */
export const IdempotencyKey = createParamDecorator((required: boolean | undefined, ctx: ExecutionContext) => {
  const raw = ctx.switchToHttp().getRequest<{ header(n: string): string | undefined }>().header('idempotency-key');
  if (raw === undefined || raw === '') {
    if (required) throw AppError.validation('Idempotency-Key', 'Thiếu header Idempotency-Key');
    return null;
  }
  const key = normalizeClientKey(raw);
  if (!key) throw AppError.validation('Idempotency-Key', 'Idempotency-Key phải gồm 8–128 ký tự [A-Za-z0-9_-]');
  return key;
});
