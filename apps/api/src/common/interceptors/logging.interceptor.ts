// Log có cấu trúc: method, path, status, thời gian, request_id. KHÔNG log body/headers/ảnh (NFR-PRI).
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { requestId?: string; user?: { id: string } }>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.switchToHttp().getResponse<Response>();
          this.logger.log(
            JSON.stringify({
              request_id: req.requestId,
              method: req.method,
              path: req.route?.path ?? req.path, // route pattern, không chứa id cụ thể
              status: res.statusCode,
              ms: Date.now() - started,
              user: req.user?.id,
            }),
          );
        },
      }),
    );
  }
}
