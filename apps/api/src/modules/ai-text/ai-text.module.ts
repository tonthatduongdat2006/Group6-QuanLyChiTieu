import { Module } from '@nestjs/common';
import { AiTextController } from './ai-text.controller';

@Module({
  controllers: [AiTextController],
})
export class AiTextModule {}
