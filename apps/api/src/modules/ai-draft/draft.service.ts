// M2-03 — sửa nháp hóa đơn, thêm/sửa/xóa món, xác nhận lưu (FR-11, FR-12, CR-02 OB-9, QC).
// Xác nhận: khóa users (BalanceGuard) → khóa nháp → validate → kiểm số dư → 1 EXPENSE + receipt + items trong 1 DB tx.
// Bị từ chối (thiếu dữ liệu, lệch tổng, chưa thiết lập / không đủ số dư) → rollback, nháp giữ nguyên trạng thái chờ.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decideSpend, MSG_INSUFFICIENT, MSG_OPENING_NOT_SET } from '../../common/balance/balance-rules';
import { BalanceService } from '../../common/balance/balance.service';
import { parseDateOnly } from '../../common/dates/dates';
import { AppError, type ErrorDetail } from '../../common/errors/app-error';
import { IDEMPOTENT_OPERATIONS, namespacedKey, requestHash } from '../../common/idempotency/idempotency';
import { MONEY_ERROR_MESSAGES, parseMoney } from '../../common/money/money';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toTransactionDto, TRANSACTION_INCLUDE } from '../transaction/transaction.mapper';
import { checkDraft } from './draft-rules';
import { toDraftDto, type DraftWithItems } from './draft.mapper';
import type { DraftItemDto, UpdateDraftDto } from './draft.dto';

type Tx = Prisma.TransactionClient;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EDITABLE = new Set(['NEEDS_INPUT', 'READY']);
const MSG_NOT_EDITABLE = 'Nháp đã được xác nhận hoặc không còn sửa được';

function cleanText(v: unknown, max: number, field: string, issues: ErrorDetail[]): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') {
    issues.push({ field, message: 'Giá trị không hợp lệ' });
    return null;
  }
  const t = v.normalize('NFC').trim();
  if (t.length > max) issues.push({ field, message: `Tối đa ${max} ký tự` });
  return t || null;
}

@Injectable()
export class DraftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
  ) {}

  /** Nháp của chính người dùng (khóa dòng khi `lock`). Không thuộc user → 404 (không lộ tồn tại). */
  private async loadOwned(tx: Tx, userId: string, draftId: string, lock: boolean): Promise<DraftWithItems> {
    if (!UUID_RE.test(draftId)) throw new AppError('NOT_FOUND');
    if (lock) {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM ai_drafts WHERE id = ${draftId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
      if (!rows.length) throw new AppError('NOT_FOUND');
    }
    const d = await tx.aiDraft.findFirst({ where: { id: draftId, userId }, include: { items: true } });
    if (!d) throw new AppError('NOT_FOUND');
    return d;
  }

  /** Tính lại trạng thái + validation_errors sau mỗi lần sửa (AC-22). */
  private async revalidate(tx: Tx, draft: DraftWithItems): Promise<DraftWithItems> {
    const items = [...draft.items].sort((a, b) => a.sortOrder - b.sortOrder);
    const c = checkDraft({
      amount: draft.amount,
      categoryId: draft.categoryId,
      transactionDate: draft.transactionDate,
      items: items.map((i) => ({ itemName: i.itemName, amount: i.amount })),
    });
    return tx.aiDraft.update({
      where: { id: draft.id },
      data: { status: c.status, validationErrors: c.issues as unknown as Prisma.InputJsonValue },
      include: { items: true },
    });
  }

  private assertEditable(d: DraftWithItems): void {
    if (!EDITABLE.has(d.status)) throw new AppError('CONFLICT', MSG_NOT_EDITABLE);
  }

  /** QC (E-07): category phải thuộc đúng user và là EXPENSE — kiểm trong cùng DB transaction. */
  private async assertCategory(tx: Tx, userId: string, categoryId: unknown): Promise<string> {
    if (typeof categoryId !== 'string' || !UUID_RE.test(categoryId)) throw AppError.validation('category_id', 'Danh mục không hợp lệ');
    const c = await tx.category.findFirst({ where: { id: categoryId, userId, type: 'EXPENSE' }, select: { id: true } });
    if (!c) throw AppError.validation('category_id', 'Danh mục không hợp lệ');
    return c.id;
  }

  async get(userId: string, draftId: string) {
    return toDraftDto(await this.loadOwned(this.prisma, userId, draftId, false));
  }

  async update(userId: string, draftId: string, dto: UpdateDraftDto) {
    const keys = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    if (!keys.length) throw AppError.validation('body', 'Cần ít nhất một trường để cập nhật');
    return this.prisma.$transaction(async (tx) => {
      const d = await this.loadOwned(tx, userId, draftId, true);
      this.assertEditable(d);
      const issues: ErrorDetail[] = [];
      const data: Prisma.AiDraftUpdateInput = {};
      if (dto.transaction_type !== undefined && dto.transaction_type !== 'EXPENSE') {
        issues.push({ field: 'transaction_type', message: 'Hóa đơn chỉ tạo khoản chi' });
      }
      if (dto.amount !== undefined) {
        const m = parseMoney(dto.amount);
        if (m.ok) data.amount = m.value;
        else issues.push({ field: 'amount', message: MONEY_ERROR_MESSAGES[m.error] });
      }
      if (dto.transaction_date !== undefined) {
        const dt = parseDateOnly(dto.transaction_date);
        if (dt) data.transactionDate = dt;
        else issues.push({ field: 'transaction_date', message: 'Ngày không hợp lệ (YYYY-MM-DD)' });
      }
      if (dto.note !== undefined) data.note = cleanText(dto.note, 500, 'note', issues);
      if (dto.merchant_name !== undefined) data.merchantName = cleanText(dto.merchant_name, 200, 'merchant_name', issues);
      if (issues.length) throw new AppError('VALIDATION_ERROR', undefined, issues);
      if (dto.category_id !== undefined) data.category = { connect: { id: await this.assertCategory(tx, userId, dto.category_id) } };
      const updated = await tx.aiDraft.update({ where: { id: d.id }, data, include: { items: true } });
      return toDraftDto(await this.revalidate(tx, updated));
    });
  }

  private parseItem(dto: DraftItemDto, requireBoth: boolean): { itemName?: string; amount?: bigint } {
    const issues: ErrorDetail[] = [];
    const out: { itemName?: string; amount?: bigint } = {};
    if (dto.item_name === undefined && dto.amount === undefined) throw AppError.validation('body', 'Cần tên món hoặc giá');
    if (dto.item_name !== undefined || requireBoth) {
      const name = typeof dto.item_name === 'string' ? dto.item_name.normalize('NFC').trim() : '';
      if (!name) issues.push({ field: 'item_name', message: 'Vui lòng nhập tên món' });
      else if (name.length > 200) issues.push({ field: 'item_name', message: 'Tên món tối đa 200 ký tự' });
      else out.itemName = name;
    }
    if (dto.amount !== undefined || requireBoth) {
      const m = parseMoney(dto.amount);
      if (m.ok) out.amount = m.value;
      else issues.push({ field: 'amount', message: MONEY_ERROR_MESSAGES[m.error] });
    }
    if (issues.length) throw new AppError('VALIDATION_ERROR', undefined, issues);
    return out;
  }

  async addItem(userId: string, draftId: string, dto: DraftItemDto) {
    const item = this.parseItem(dto, true);
    return this.prisma.$transaction(async (tx) => {
      const d = await this.loadOwned(tx, userId, draftId, true);
      this.assertEditable(d);
      const sortOrder = d.items.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
      await tx.aiDraftItem.create({ data: { draftId: d.id, itemName: item.itemName!, amount: item.amount!, sortOrder } });
      return toDraftDto(await this.revalidate(tx, await this.loadOwned(tx, userId, draftId, false)));
    });
  }

  private async ownedItem(tx: Tx, userId: string, itemId: string) {
    if (!UUID_RE.test(itemId)) throw new AppError('NOT_FOUND');
    const item = await tx.aiDraftItem.findFirst({ where: { id: itemId, draft: { userId } }, select: { id: true, draftId: true } });
    if (!item) throw new AppError('NOT_FOUND');
    const d = await this.loadOwned(tx, userId, item.draftId, true);
    this.assertEditable(d);
    return { item, draftId: d.id };
  }

  async updateItem(userId: string, itemId: string, dto: DraftItemDto) {
    const patch = this.parseItem(dto, false);
    return this.prisma.$transaction(async (tx) => {
      const { item, draftId } = await this.ownedItem(tx, userId, itemId);
      await tx.aiDraftItem.update({ where: { id: item.id }, data: patch });
      return toDraftDto(await this.revalidate(tx, await this.loadOwned(tx, userId, draftId, false)));
    });
  }

  async deleteItem(userId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { item, draftId } = await this.ownedItem(tx, userId, itemId);
      await tx.aiDraftItem.delete({ where: { id: item.id } });
      return toDraftDto(await this.revalidate(tx, await this.loadOwned(tx, userId, draftId, false)));
    });
  }

  /** POST /ai/drafts/{draftId}/confirm — Idempotency-Key bắt buộc (ai_drafts.confirm_*). */
  async confirm(userId: string, draftId: string, clientKey: string) {
    const op = IDEMPOTENT_OPERATIONS.DRAFT_CONFIRM;
    const key = namespacedKey(op, clientKey);
    const hash = requestHash(op, { draftId }, {});
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Thứ tự khóa cố định: users → ai_drafts (tránh deadlock với tạo khoản chi)
        const state = await this.balance.lockAndRead(tx, userId);
        const d = await this.loadOwned(tx, userId, draftId, true);

        const sameKeyOther = await tx.aiDraft.findFirst({ where: { userId, confirmIdempotencyKey: key, NOT: { id: d.id } }, select: { id: true } });
        if (sameKeyOther) throw new AppError('IDEMPOTENCY_KEY_REUSED');

        if (d.status === 'CONFIRMED' && d.transactionId) {
          // Replay (mất phản hồi sau commit) hoặc bấm xác nhận lần hai: trả đúng giao dịch đã tạo, không tạo thêm.
          const t = await tx.transaction.findUniqueOrThrow({ where: { id: d.transactionId }, include: TRANSACTION_INCLUDE });
          return { draft: toDraftDto(d), transaction: toTransactionDto(t) };
        }
        if (!EDITABLE.has(d.status)) throw new AppError('CONFLICT', MSG_NOT_EDITABLE);

        const items = [...d.items].sort((a, b) => a.sortOrder - b.sortOrder);
        const c = checkDraft({
          amount: d.amount,
          categoryId: d.categoryId,
          transactionDate: d.transactionDate,
          items: items.map((i) => ({ itemName: i.itemName, amount: i.amount })),
        });
        if (c.mismatch) throw new AppError('RECEIPT_TOTAL_MISMATCH', undefined, c.issues.filter((i) => i.field === 'items'));
        if (c.status !== 'READY') throw new AppError('VALIDATION_ERROR', 'Nháp chưa đủ thông tin để lưu', c.issues);
        const categoryId = await this.assertCategory(tx, userId, d.categoryId);

        // CR-02 OB-9: áp dụng OB-6…OB-8 lúc xác nhận lưu (users đã bị khóa ở trên)
        const decision = decideSpend(state, d.amount!);
        if (decision === 'NOT_SET') {
          throw new AppError('INSUFFICIENT_BALANCE', MSG_OPENING_NOT_SET, [{ field: 'opening_balance', message: MSG_OPENING_NOT_SET }]);
        }
        if (decision === 'INSUFFICIENT') throw new AppError('INSUFFICIENT_BALANCE', MSG_INSUFFICIENT);

        const t = await tx.transaction.create({
          data: {
            userId,
            categoryId,
            type: 'EXPENSE',
            amount: d.amount!,
            transactionDate: d.transactionDate!,
            note: d.note,
            source: 'AI_SCAN',
            receiptDetails: {
              create: {
                merchantName: d.merchantName,
                items: { create: items.map((i, idx) => ({ itemName: i.itemName!, amount: i.amount!, sortOrder: idx })) },
              },
            },
          },
          include: TRANSACTION_INCLUDE,
        });
        // compare-and-set: chỉ nháp đang chờ mới chuyển sang CONFIRMED
        const { count } = await tx.aiDraft.updateMany({
          where: { id: d.id, status: { in: ['NEEDS_INPUT', 'READY'] } },
          data: { status: 'CONFIRMED', transactionId: t.id, confirmIdempotencyKey: key, confirmRequestHash: hash, validationErrors: [] },
        });
        if (count !== 1) throw new AppError('CONFLICT', MSG_NOT_EDITABLE);
        const confirmed = await this.loadOwned(tx, userId, draftId, false);
        return { draft: toDraftDto(confirmed), transaction: toTransactionDto(t) };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('IDEMPOTENCY_KEY_REUSED');
      throw e;
    }
  }
}
