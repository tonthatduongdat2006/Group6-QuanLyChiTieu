import { Module } from '@nestjs/common';
import { OpeningBalanceController } from './opening-balance.controller';

@Module({ controllers: [OpeningBalanceController] })
export class OpeningBalanceModule {}
