// Cấu hình app dùng chung cho main.ts (local) và test e2e — để test chạy đúng y như production.
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { APP_CONFIG, type AppConfig } from './common/config/env';
import { appValidationPipe } from './common/errors/validation.pipe';
import { requestIdMiddleware } from './common/interceptors/request-id.middleware';

export const API_PREFIX = 'api/v1';

export function configureApp(app: INestApplication): INestApplication {
  const cfg = app.get<AppConfig>(APP_CONFIG);
  app.setGlobalPrefix(API_PREFIX);
  // Gắn request_id cho MỌI request, kể cả route không tồn tại (404) và body JSON hỏng
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.enableCors({
    // Mobile app không cần CORS; chỉ mở cho origin được khai báo (vd Expo web khi dev)
    origin: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
  app.useGlobalPipes(appValidationPipe);
  app.enableShutdownHooks();
  return app;
}
