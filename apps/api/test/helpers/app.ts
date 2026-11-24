// Dựng app Nest thật (đủ guard/filter/pipe như production) với đồng hồ cố định.
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { CLOCK } from '../../src/common/config/config.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { FixedClock } from './clock';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  clock: FixedClock;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

export async function createTestApp(overrides: { provide: unknown; useValue: unknown }[] = []): Promise<TestContext> {
  const clock = new FixedClock();
  let builder = Test.createTestingModule({ imports: [AppModule] }).overrideProvider(CLOCK).useValue(clock);
  for (const o of overrides) builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  const prisma = app.get(PrismaService);
  return {
    app,
    prisma,
    clock,
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
  };
}

const TABLES = [
  'receipt_items', 'receipt_details', 'ai_draft_items', 'ai_drafts', 'ai_draft_batches', 'ai_messages',
  'ai_conversations', 'jar_transactions', 'saving_jars', 'budgets', 'transactions', 'categories',
  'auth_sessions', 'users',
];

/** Xóa sạch dữ liệu giữa các test (nhanh hơn tạo DB mới). */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

/** Chạy n lời gọi song song (cho test đồng thời: IT-CONC-*). */
export function parallel<T>(n: number, fn: (i: number) => Promise<T>): Promise<T[]> {
  return Promise.all(Array.from({ length: n }, (_, i) => fn(i)));
}
