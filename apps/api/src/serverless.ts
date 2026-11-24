// Entry cho môi trường serverless (Vercel Node function): khởi tạo Nest một lần cho mỗi instance rồi tái sử dụng.
// Dùng chung configureApp với main.ts để hành vi giống hệt bản chạy local/test.
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let cached: Promise<Handler> | null = null;

async function create(): Promise<Handler> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  // Sau proxy của nền tảng: lấy IP thật từ X-Forwarded-For để throttle theo IP (QD: 10 lần/phút/IP cho auth)
  app.set('trust proxy', 1);
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cached ??= create().catch((e) => {
    cached = null; // lần sau thử khởi tạo lại (vd DB tạm thời không kết nối được)
    throw e;
  });
  (await cached)(req, res);
}
