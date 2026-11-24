import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './common/config/config.module';
import { APP_CONFIG, type AppConfig } from './common/config/env';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { HealthController } from './modules/health/health.controller';
import { UserModule } from './modules/user/user.module';
import { BalanceModule } from './common/balance/balance.module';
import { OpeningBalanceModule } from './modules/balance/balance.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AiProviderModule } from './modules/ai-provider/ai-provider.module';
import { AiScanModule } from './modules/ai-scan/ai-scan.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => ({
        throttlers: [{ name: 'default', ttl: cfg.throttleTtlMs, limit: cfg.throttleLimit }],
        // Integration test gọi auth liên tục từ cùng IP → tắt throttle trong NODE_ENV=test
        skipIf: () => cfg.nodeEnv === 'test',
      }),
    }),
    AuthModule,
    UserModule,
    CategoryModule,
    BalanceModule,
    OpeningBalanceModule,
    TransactionModule,
    DashboardModule,
    AiProviderModule,
    AiScanModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Thứ tự guard: throttle trước (chặn spam trước khi chạm DB), rồi xác thực
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule {}
