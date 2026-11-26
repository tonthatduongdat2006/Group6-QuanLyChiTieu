import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Gắn request_id cho mọi request (nhận từ header X-Request-Id nếu hợp lệ). */
export function requestIdMiddleware(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
