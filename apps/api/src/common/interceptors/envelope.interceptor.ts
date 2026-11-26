// Bọc phản hồi thành công: `{ data }` hoặc `{ data, meta }` cho danh sách phân trang (API v1.1 §1.3, §1.5)
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

export class Paginated<T> {
  constructor(
    readonly data: T[],
    readonly meta: { page: number; page_size: number; total: number; total_pages: number },
  ) {}

  static of<T>(data: T[], page: number, pageSize: number, total: number): Paginated<T> {
    return new Paginated(data, { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) });
  }
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        if (body === undefined || body === null) return undefined; // 204
        if (body instanceof Paginated) return { data: body.data, meta: body.meta };
        return { data: body };
      }),
    );
  }
}
