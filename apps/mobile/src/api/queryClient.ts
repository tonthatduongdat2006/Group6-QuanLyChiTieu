import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // chỉ retry lỗi mạng/5xx; không retry lỗi nghiệp vụ 4xx
      retry: (count, e) => count < 2 && e instanceof ApiError && e.retryable,
    },
    // mutation KHÔNG tự retry: người dùng bấm thử lại với cùng Idempotency-Key
    mutations: { retry: false },
  },
});
