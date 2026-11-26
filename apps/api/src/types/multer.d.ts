// Khai báo tối thiểu cho `multer` (đi kèm @nestjs/platform-express; không thêm gói @types mới).
declare module 'multer' {
  import type { RequestHandler } from 'express';
  interface MulterOptions {
    storage?: unknown;
    limits?: { fileSize?: number; files?: number; fields?: number };
  }
  interface Multer {
    single(field: string): RequestHandler;
  }
  interface MulterStatic {
    (opts?: MulterOptions): Multer;
    memoryStorage(): unknown;
  }
  const multer: MulterStatic;
  export default multer;
}
