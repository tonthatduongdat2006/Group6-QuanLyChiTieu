// MVP: POST/GET /transactions, GET /transactions/{transactionId}. PATCH/DELETE thuộc phần hoãn (CR-01).
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { CreateTransactionDto } from './transaction.dto';
import { TransactionService, type ListQuery } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly service: TransactionService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto, @IdempotencyKey() key: string | null) {
    return this.service.create(user.id, dto, key);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ListQuery) {
    return this.service.list(user.id, q);
  }

  @Get(':transactionId')
  get(@CurrentUser() user: AuthUser, @Param('transactionId') id: string) {
    return this.service.get(user.id, id);
  }
}
