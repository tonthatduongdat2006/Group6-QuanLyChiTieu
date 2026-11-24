// BalanceGuard dùng chung (CR-02 §3, D-07): mọi thao tác đổi số dư khóa dòng users FOR UPDATE trong cùng DB transaction,
// tính số dư dự kiến, vi phạm → ném AppError để transaction rollback toàn bộ.
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';
import {
  availableBalance,
  decideSpend,
  MSG_INSUFFICIENT,
  MSG_OPENING_INVALID,
  MSG_OPENING_LOCKED,
  MSG_OPENING_NOT_SET,
  parseOpeningValue,
  type BalanceState,
} from './balance-rules';

type Tx = Prisma.TransactionClient;

export interface BalanceSummary {
  opening_balance: string;
  opening_balance_set: boolean;
  locked: boolean;
  available_balance: string;
}

@Injectable()
export class BalanceService {
  /** Khóa người dùng (thứ tự khóa cố định: users trước mọi bảng khác) và đọc trạng thái số dư. */
  async lockAndRead(tx: Tx, userId: string): Promise<BalanceState & { hasExpense: boolean }> {
    const rows = await tx.$queryRaw<{ opening_balance: bigint; opening_balance_set_at: Date | null }[]>`
      SELECT opening_balance, opening_balance_set_at FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new AppError('UNAUTHORIZED');
    const sp = await this.spending(tx, userId);
    return {
      openingBalance: row.opening_balance,
      openingBalanceSet: row.opening_balance_set_at !== null,
      spentTotal: sp.spentTotal,
      hasExpense: sp.hasExpense,
    };
  }

  private async spending(tx: Tx, userId: string): Promise<{ spentTotal: bigint; hasExpense: boolean }> {
    const [agg] = await tx.$queryRaw<{ spent: bigint | null; any_expense: boolean }[]>`
      SELECT COALESCE(SUM(amount) FILTER (WHERE deleted_at IS NULL), 0)::bigint AS spent,
             COUNT(*) > 0 AS any_expense
      FROM transactions WHERE user_id = ${userId}::uuid AND type = 'EXPENSE'`;
    return { spentTotal: agg?.spent ?? 0n, hasExpense: agg?.any_expense ?? false };
  }

  /** Gọi trong DB transaction, TRƯỚC khi ghi khoản chi. Vi phạm → 422 INSUFFICIENT_BALANCE (rollback). */
  async assertCanSpend(tx: Tx, userId: string, amount: bigint): Promise<void> {
    const state = await this.lockAndRead(tx, userId);
    const d = decideSpend(state, amount);
    if (d === 'NOT_SET') {
      throw new AppError('INSUFFICIENT_BALANCE', MSG_OPENING_NOT_SET, [{ field: 'opening_balance', message: MSG_OPENING_NOT_SET }]);
    }
    if (d === 'INSUFFICIENT') throw new AppError('INSUFFICIENT_BALANCE', MSG_INSUFFICIENT);
  }

  /** PUT /users/me/opening-balance — OB-2…OB-5. Không tạo giao dịch. */
  async setOpeningBalance(prisma: { $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> }, userId: string, raw: unknown, now: Date): Promise<BalanceSummary> {
    const value = parseOpeningValue(raw);
    if (value === null) throw new AppError('VALIDATION_ERROR', MSG_OPENING_INVALID, [{ field: 'amount', message: MSG_OPENING_INVALID }]);
    return prisma.$transaction(async (tx) => {
      const state = await this.lockAndRead(tx, userId);
      if (state.hasExpense) {
        throw new AppError('CONFLICT', MSG_OPENING_LOCKED, [{ field: 'opening_balance', message: MSG_OPENING_LOCKED }]);
      }
      await tx.user.update({ where: { id: userId }, data: { openingBalance: value, openingBalanceSetAt: now } });
      return toSummary({ openingBalance: value, openingBalanceSet: true, spentTotal: state.spentTotal }, false);
    });
  }

  /** Đọc không khóa (Dashboard). */
  async summary(tx: Tx, userId: string): Promise<BalanceSummary> {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { openingBalance: true, openingBalanceSetAt: true } });
    if (!u) throw new AppError('UNAUTHORIZED');
    const sp = await this.spending(tx, userId);
    return toSummary({ openingBalance: u.openingBalance, openingBalanceSet: u.openingBalanceSetAt !== null, spentTotal: sp.spentTotal }, sp.hasExpense);
  }
}

function toSummary(s: BalanceState, locked: boolean): BalanceSummary {
  return {
    opening_balance: s.openingBalance.toString(),
    opening_balance_set: s.openingBalanceSet,
    locked,
    available_balance: availableBalance(s).toString(),
  };
}
