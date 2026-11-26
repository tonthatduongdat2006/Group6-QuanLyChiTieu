// CR-02 — PUT /users/me/opening-balance. Body chỉ có `amount` (chuỗi); kiểm định dạng ở BalanceService để giữ đúng thông báo.
import { Body, Controller, Inject, Put } from '@nestjs/common';
import { IsDefined } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { BalanceService } from '../../common/balance/balance.service';
import { CLOCK } from '../../common/config/config.module';
import type { Clock } from '../../common/dates/dates';
import { PrismaService } from '../../infra/prisma/prisma.service';

export class OpeningBalanceDto {
  @IsDefined({ message: 'Vui lòng nhập số dư ban đầu' })
  amount!: unknown;
}

@Controller('users')
export class OpeningBalanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Put('me/opening-balance')
  async set(@CurrentUser() user: AuthUser, @Body() dto: OpeningBalanceDto) {
    const s = await this.balance.setOpeningBalance(this.prisma, user.id, dto.amount, this.clock.now());
    return { opening_balance: s.opening_balance, opening_balance_set: s.opening_balance_set, locked: s.locked };
  }
}
