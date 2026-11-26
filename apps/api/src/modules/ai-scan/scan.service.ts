// M2-02 — POST /ai/receipts/scan (FR-11, AC-21/24/25). Ảnh chỉ nằm trong bộ nhớ của request:
// không lưu DB/đĩa/log; chỉ giữ SHA-256 của byte ảnh ở ai_draft_batches.idempotency_request_hash.
// Quét chỉ tạo NHÁP (1 batch AI_SCAN + 1 draft + items trong 1 DB tx) — không tạo giao dịch, không chọn danh mục.
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { APP_CONFIG, type AppConfig } from '../../common/config/env';
import { CLOCK } from '../../common/config/config.module';
import { parseDateOnly, type Clock } from '../../common/dates/dates';
import { AppError } from '../../common/errors/app-error';
import { decideReplay, IDEMPOTENT_OPERATIONS, namespacedKey, sha256Hex, SingleFlight } from '../../common/idempotency/idempotency';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { checkDraft } from '../ai-draft/draft-rules';
import { toDraftDto } from '../ai-draft/draft.mapper';
import { ProviderError, RECEIPT_AI_PROVIDER, type ReceiptAiProvider } from '../ai-provider/ai-provider';
import { parseReceiptOutput } from '../ai-provider/receipt-output';
import { looksDecodable, sniffImage } from './image-check';
import { ScanRateLimiter } from './scan-rate-limiter';

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

type ScanResult = { draft_batch: { id: string; source_type: 'AI_SCAN' }; draft: ReturnType<typeof toDraftDto> };

@Injectable()
export class ScanService {
  private readonly logger = new Logger('AIScan');
  private readonly flight = new SingleFlight<ScanResult>();
  private readonly limiter: ScanRateLimiter;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RECEIPT_AI_PROVIDER) private readonly provider: ReceiptAiProvider,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.limiter = new ScanRateLimiter(cfg.scanLimitPerHour);
  }

  async scan(userId: string, file: UploadedImage | undefined, clientKey: string, signal: AbortSignal): Promise<ScanResult> {
    if (!file?.buffer?.length) throw AppError.validation('image', 'Vui lòng chọn ảnh hóa đơn');
    try {
      const kind = sniffImage(file.buffer);
      if (!kind || !this.cfg.receiptAllowedMime.includes(kind) || kind !== file.mimetype) {
        throw AppError.validation('image', 'Chỉ nhận ảnh JPEG, PNG hoặc WEBP');
      }
      if (!looksDecodable(kind, file.buffer)) throw AppError.validation('image', 'Ảnh bị hỏng hoặc không đọc được');

      const key = namespacedKey(IDEMPOTENT_OPERATIONS.AI_SCAN, clientKey);
      const hash = sha256Hex(file.buffer); // fingerprint duy nhất được lưu (IT-PRIV)
      const replay = await this.findReplay(userId, key, hash);
      if (replay) return replay;

      return await this.flight.run(`${userId}:${key}`, async () => {
        if (!this.limiter.tryAcquire(userId, this.clock.now().getTime())) {
          throw new AppError('RATE_LIMITED', 'Bạn đã quét quá nhiều hóa đơn, vui lòng thử lại sau');
        }
        let raw: string;
        try {
          raw = await this.provider.analyzeReceipt(file.buffer, kind, signal);
        } catch (e) {
          this.limiter.release(userId);
          throw this.mapProviderError(e);
        }
        let extraction;
        try {
          extraction = parseReceiptOutput(raw);
        } catch (e) {
          throw this.mapProviderError(e);
        }
        // Hủy TRƯỚC commit: không tạo batch/draft, key chưa ghi → retry chạy lại như request mới
        if (signal.aborted) throw new AppError('BAD_REQUEST', 'Đã hủy tải ảnh');
        return this.persist(userId, key, hash, extraction);
      });
    } finally {
      file.buffer.fill(0); // hủy nội dung ảnh trong bộ nhớ sau khi xử lý (thành công / lỗi / hủy)
    }
  }

  private mapProviderError(e: unknown): AppError {
    if (e instanceof AppError) return e;
    if (e instanceof ProviderError) {
      this.logger.warn(`provider ${e.kind}`); // chỉ ghi loại lỗi, không ghi ảnh/nội dung
      if (e.kind === 'aborted') return new AppError('BAD_REQUEST', 'Đã hủy tải ảnh');
      if (e.kind === 'rate_limited') return new AppError('RATE_LIMITED', 'Trợ lý AI đang quá tải, vui lòng thử lại sau');
      return new AppError('AI_PROVIDER_ERROR', 'Chưa đọc được hóa đơn, bạn có thể thử lại hoặc nhập tay');
    }
    return new AppError('AI_PROVIDER_ERROR');
  }

  private async findReplay(userId: string, key: string, hash: string): Promise<ScanResult | null> {
    const batch = await this.prisma.aiDraftBatch.findUnique({
      where: { userId_sourceType_idempotencyKey: { userId, sourceType: 'AI_SCAN', idempotencyKey: key } },
      include: { drafts: { include: { items: true } } },
    });
    const d = decideReplay(batch ? { requestHash: batch.idempotencyRequestHash } : null, hash);
    if (d === 'CONFLICT') throw new AppError('IDEMPOTENCY_KEY_REUSED', 'Khóa yêu cầu đã dùng cho ảnh khác');
    if (d === 'NEW' || !batch?.drafts[0]) return null;
    return { draft_batch: { id: batch.id, source_type: 'AI_SCAN' }, draft: toDraftDto(batch.drafts[0]) };
  }

  private async persist(userId: string, key: string, hash: string, x: ReturnType<typeof parseReceiptOutput>): Promise<ScanResult> {
    const date = x.transaction_date ? parseDateOnly(x.transaction_date) : null;
    const check = checkDraft({
      amount: x.total,
      categoryId: null, // AC-25: AI không chọn danh mục
      transactionDate: date,
      items: x.items.map((i) => ({ itemName: i.item_name, amount: i.amount })),
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const batch = await tx.aiDraftBatch.create({
          data: { userId, sourceType: 'AI_SCAN', idempotencyKey: key, idempotencyRequestHash: hash },
        });
        const draft = await tx.aiDraft.create({
          data: {
            userId,
            batchId: batch.id,
            transactionType: 'EXPENSE',
            amount: x.total,
            transactionDate: date,
            merchantName: x.merchant_name,
            status: check.status,
            validationErrors: check.issues as unknown as Prisma.InputJsonValue,
            items: { create: x.items.map((i, idx) => ({ itemName: i.item_name, amount: i.amount, sortOrder: idx })) },
          },
          include: { items: true },
        });
        return { draft_batch: { id: batch.id, source_type: 'AI_SCAN' as const }, draft: toDraftDto(draft) };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const replay = await this.findReplay(userId, key, hash);
        if (replay) return replay;
      }
      throw e;
    }
  }
}
