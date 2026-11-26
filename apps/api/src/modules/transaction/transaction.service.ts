// MVP (CR-01, CR-02): tạo khoản chi (chỉ EXPENSE) qua BalanceGuard; xem danh sách theo tháng + chi tiết.
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BalanceService } from '../../common/balance/balance.service';
import { CLOCK } from '../../common/config/config.module';
import { currentMonthInBusinessTz, parseDateOnly, parseMonth, type Clock } from '../../common/dates/dates';
import { AppError, type ErrorDetail } from '../../common/errors/app-error';
import { decideReplay, IDEMPOTENT_OPERATIONS, namespacedKey, requestHash } from '../../common/idempotency/idempotency';
import { parseMoney, MONEY_ERROR_MESSAGES } from '../../common/money/money';
import { Paginated } from '../../common/interceptors/envelope.interceptor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { CreateTransactionDto } from './transaction.dto';
import { toTransactionDto, TRANSACTION_INCLUDE } from './transaction.mapper';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MSG_INCOME_NOT_IN_MVP = 'MVP chỉ hỗ trợ khoản chi';

export interface ListQuery {
  month?: string;
  type?: string;
  category_id?: string;
  page?: string;
  page_size?: string;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(userId: string, dto: CreateTransactionDto, clientKey: string | null) {
    const issues: ErrorDetail[] = [];
    if (dto.type !== 'EXPENSE') {
      issues.push({ field: 'type', message: dto.type === 'INCOME' ? MSG_INCOME_NOT_IN_MVP : 'Loại giao dịch không hợp lệ' });
    }
    const money = parseMoney(dto.amount);
    if (!money.ok) issues.push({ field: 'amount', message: MONEY_ERROR_MESSAGES[money.error] });
    const date = parseDateOnly(dto.transaction_date);
    if (!date) issues.push({ field: 'transaction_date', message: 'Ngày không hợp lệ (YYYY-MM-DD)' });
    const categoryId = typeof dto.category_id === 'string' && UUID_RE.test(dto.category_id) ? dto.category_id : null;
    if (!categoryId) issues.push({ field: 'category_id', message: 'Vui lòng chọn danh mục' });
    if (issues.length) throw new AppError('VALIDATION_ERROR', undefined, issues);

    const category = await this.prisma.category.findFirst({ where: { id: categoryId!, userId, type: 'EXPENSE' } });
    if (!category) throw AppError.validation('category_id', 'Danh mục không hợp lệ');

    const note = dto.note?.trim() || null;
    const amount = (money as { ok: true; value: bigint }).value;
    const body = { type: 'EXPENSE', amount: amount.toString(), category_id: categoryId, transaction_date: dto.transaction_date, note };
    const key = clientKey ? namespacedKey(IDEMPOTENT_OPERATIONS.TRANSACTION_CREATE, clientKey) : null;
    const hash = key ? requestHash(IDEMPOTENT_OPERATIONS.TRANSACTION_CREATE, {}, body) : null;

    if (key) {
      const replay = await this.findReplay(userId, key, hash!);
      if (replay) return replay;
    }
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        await this.balance.assertCanSpend(tx, userId, amount); // khóa users FOR UPDATE + OB-6…OB-8
        if (key) {
          const again = await tx.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: TRANSACTION_INCLUDE });
          if (again) return again;
        }
        return tx.transaction.create({
          data: {
            userId,
            categoryId: categoryId!,
            type: 'EXPENSE',
            amount,
            transactionDate: date!,
            note,
            source: 'MANUAL',
            idempotencyKey: key,
            idempotencyRequestHash: hash,
          },
          include: TRANSACTION_INCLUDE,
        });
      });
      if (key && created.idempotencyRequestHash !== hash) throw new AppError('IDEMPOTENCY_KEY_REUSED');
      return toTransactionDto(created);
    } catch (e) {
      // Hai request cùng key chạy song song: unique (user_id, idempotency_key) là chốt chặn cuối
      if (key && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const replay = await this.findReplay(userId, key, hash!);
        if (replay) return replay;
      }
      throw e;
    }
  }

  private async findReplay(userId: string, key: string, hash: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: key } }, include: TRANSACTION_INCLUDE });
    const d = decideReplay(existing ? { requestHash: existing.idempotencyRequestHash } : null, hash);
    if (d === 'CONFLICT') throw new AppError('IDEMPOTENCY_KEY_REUSED');
    return d === 'REPLAY' ? toTransactionDto(existing!) : null;
  }

  async list(userId: string, q: ListQuery) {
    const month = parseMonth(q.month ?? currentMonthInBusinessTz(this.clock));
    if (!month) throw AppError.validation('month', 'Tháng không hợp lệ (YYYY-MM)');
    if (q.type !== undefined && q.type !== 'INCOME' && q.type !== 'EXPENSE') throw AppError.validation('type', 'type phải là INCOME hoặc EXPENSE');
    if (q.category_id !== undefined && !UUID_RE.test(q.category_id)) throw AppError.validation('category_id', 'category_id không hợp lệ');
    const page = toInt(q.page, 1, 1, 100000, 'page');
    const pageSize = toInt(q.page_size, 20, 1, 100, 'page_size');
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      transactionDate: { gte: month.monthStart, lt: month.nextMonthStart },
      ...(q.type && { type: q.type as 'INCOME' | 'EXPENSE' }),
      ...(q.category_id && { categoryId: q.category_id }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: TRANSACTION_INCLUDE,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return Paginated.of(rows.map(toTransactionDto), page, pageSize, total);
  }

  async get(userId: string, id: string) {
    if (!UUID_RE.test(id)) throw new AppError('NOT_FOUND');
    const t = await this.prisma.transaction.findFirst({ where: { id, userId, deletedAt: null }, include: TRANSACTION_INCLUDE });
    if (!t) throw new AppError('NOT_FOUND');
    return toTransactionDto(t);
  }
}

function toInt(raw: string | undefined, def: number, min: number, max: number, field: string): number {
  if (raw === undefined || raw === '') return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw AppError.validation(field, `${field} phải là số nguyên từ ${min} đến ${max}`);
  return n;
}
