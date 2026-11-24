import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { APP_CONFIG, type AppConfig } from './common/config/env';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule, { bodyParser: true }));
  const cfg = app.get<AppConfig>(APP_CONFIG);
  await app.listen(cfg.port);
  console.log(`API: http://localhost:${cfg.port}/api/v1/health`);
}
void bootstrap();
