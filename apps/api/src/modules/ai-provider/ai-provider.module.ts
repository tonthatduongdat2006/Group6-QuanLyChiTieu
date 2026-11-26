import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/env';
import { RECEIPT_AI_PROVIDER } from './ai-provider';
import { ClaudeReceiptProvider } from './claude-receipt.provider';
import { FakeReceiptProvider } from './fake-receipt.provider';

@Global()
@Module({
  providers: [
    {
      provide: RECEIPT_AI_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => (cfg.aiProvider === 'claude' ? new ClaudeReceiptProvider(cfg) : new FakeReceiptProvider()),
    },
  ],
  exports: [RECEIPT_AI_PROVIDER],
})
export class AiProviderModule {}
