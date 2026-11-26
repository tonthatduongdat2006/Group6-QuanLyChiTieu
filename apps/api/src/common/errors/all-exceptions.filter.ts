// Mọi lỗi → envelope `{ error: { code, message, details?, request_id } }` (API v1.1 §1.4).
// Không bao giờ trả stack trace, câu SQL, secret hay đường dẫn file.
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { AppError, DEFAULT_MESSAGES, type ErrorCode, type ErrorDetail } from './app-error';

function fromHttpStatus(status: number): ErrorCode {
  switch (status) {
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'VALIDATION_ERROR';
    case 429: return 'RATE_LIMITED';
    case 503: return 'SERVICE_UNAVAILABLE';
    default: return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST';
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return new AppError('CONFLICT');
    if (err.code === 'P2025') return new AppError('NOT_FOUND');
    if (err.code === 'P2034') return new AppError('SERVICE_UNAVAILABLE', 'Hệ thống đang bận, vui lòng thử lại');
    if (err.code === 'P2003') return new AppError('VALIDATION_ERROR');
  }
  if (err instanceof HttpException) {
    const status = err.getStatus();
    // body-parser: JSON hỏng / quá lớn → 400 BAD_REQUEST (D-15: không có PAYLOAD_TOO_LARGE)
    const code = fromHttpStatus(status === HttpStatus.PAYLOAD_TOO_LARGE ? 400 : status);
    return new AppError(code, DEFAULT_MESSAGES[code]);
  }
  const anyErr = err as { type?: string; status?: number };
  if (anyErr?.type === 'entity.parse.failed' || anyErr?.type === 'entity.too.large') return new AppError('BAD_REQUEST');
  return new AppError('INTERNAL_SERVER_ERROR');
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const appErr = toAppError(exception);
    if (appErr.status >= 500) {
      // chỉ log tên lỗi + message nội bộ, không log body/headers
      this.logger.error(
        `${req.method} ${req.path} → ${appErr.code} [${req.requestId}] ${(exception as Error)?.name}: ${(exception as Error)?.message}`,
      );
    }
    const body: { code: ErrorCode; message: string; details?: ErrorDetail[]; request_id: string } = {
      code: appErr.code,
      message: appErr.message,
      request_id: req.requestId ?? 'unknown',
    };
    if (appErr.details?.length) body.details = appErr.details;
    res.status(appErr.status).json({ error: body });
  }
}
