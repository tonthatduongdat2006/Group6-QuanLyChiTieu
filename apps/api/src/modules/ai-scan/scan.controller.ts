// POST /ai/receipts/scan — multipart `image`, Idempotency-Key bắt buộc. Ảnh đọc vào bộ nhớ (memoryStorage), không ghi đĩa.
import { Controller, HttpCode, Inject, Post, Req, Res, type NestInterceptor, type CallHandler, type ExecutionContext, Injectable, UseInterceptors } from '@nestjs/common';
import type { Request, Response } from 'express';
import multer from 'multer';
import { from, switchMap, type Observable } from 'rxjs';
import { APP_CONFIG, type AppConfig } from '../../common/config/env';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { AppError } from '../../common/errors/app-error';
import { ScanService, type UploadedImage } from './scan.service';

/** Đọc đúng 1 tệp `image` ≤ RECEIPT_MAX_BYTES vào bộ nhớ; quá cỡ → 422 có kiểm soát (D-15: không có PAYLOAD_TOO_LARGE). */
@Injectable()
export class ReceiptUploadInterceptor implements NestInterceptor {
  private readonly upload: ReturnType<ReturnType<typeof multer>['single']>;
  private readonly maxMb: string;

  constructor(@Inject(APP_CONFIG) cfg: AppConfig) {
    this.upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.receiptMaxBytes, files: 1, fields: 5 } }).single('image');
    this.maxMb = (cfg.receiptMaxBytes / 1024 / 1024).toFixed(0);
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const run = new Promise<void>((resolve, reject) =>
      this.upload(req, res, (err: unknown) => {
        if (!err) return resolve();
        const code = (err as { code?: string }).code;
        if (code === 'LIMIT_FILE_SIZE') return reject(AppError.validation('image', `Ảnh vượt quá ${this.maxMb} MB`));
        if (code?.startsWith('LIMIT_')) return reject(AppError.validation('image', 'Chỉ gửi 1 ảnh trong trường image'));
        return reject(new AppError('BAD_REQUEST', 'Dữ liệu tải lên không hợp lệ'));
      }),
    );
    return from(run).pipe(switchMap(() => next.handle()));
  }
}

@Controller('ai/receipts')
export class ScanController {
  constructor(private readonly scans: ScanService) {}

  @Post('scan')
  @HttpCode(201)
  @UseInterceptors(ReceiptUploadInterceptor)
  scan(@CurrentUser() u: AuthUser, @IdempotencyKey(true) key: string, @Req() req: Request & { file?: UploadedImage }, @Res({ passthrough: true }) res: Response) {
    // Client ngắt kết nối trước khi có phản hồi → hủy lời gọi AI, không tạo nháp
    const ac = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) ac.abort();
    });
    return this.scans.scan(u.id, req.file, key, ac.signal);
  }
}
