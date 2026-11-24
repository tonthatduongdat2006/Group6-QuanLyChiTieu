// GET /dashboard — MVP (CR-02 §3.2): số dư theo công thức opening − Σ chi; monthly_income luôn "0"; budget_alerts luôn [].
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { BalanceService } from '../../common/balance/balance.service';
import { CLOCK } from '../../common/config/config.module';
import { currentMonthInBusinessTz, parseMonth, type Clock } from '../../common/dates/dates';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toTransactionDto, TRANSACTION_INCLUDE } from '../transaction/transaction.mapper';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser, @Query('month') monthRaw?: string) {
    const month = parseMonth(monthRaw ?? currentMonthInBusinessTz(this.clock));
    if (!month) throw AppError.validation('month', 'Tháng không hợp lệ (YYYY-MM)');
    return this.prisma.$transaction(async (tx) => {
      const b = await this.balance.summary(tx, user.id);
      const monthly = await tx.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: user.id, type: 'EXPENSE', deletedAt: null, transactionDate: { gte: month.monthStart, lt: month.nextMonthStart } },
      });
      const recent = await tx.transaction.findMany({
        where: { userId: user.id, deletedAt: null },
        include: TRANSACTION_INCLUDE,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
      });
      return {
        available_balance: b.available_balance,
        opening_balance: b.opening_balance,
        opening_balance_set: b.opening_balance_set,
        monthly_income: '0',
        monthly_expense: (monthly._sum.amount ?? 0n).toString(),
        recent_transactions: recent.map(toTransactionDto),
        budget_alerts: [],
      };
    });
  }
}
