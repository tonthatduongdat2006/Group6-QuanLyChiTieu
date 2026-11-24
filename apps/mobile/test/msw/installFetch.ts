// Định tuyến global.fetch qua MSW handlers bằng `getResponse` (không cần interceptor node — ổn định hơn trong môi trường RN/Jest).
import { getResponse } from 'msw';
import { handlers } from './handlers';

export function installMockFetch() {
  const original = global.fetch;
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input as string, init);
    const res = await getResponse(handlers, req);
    return res ?? new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'no handler', request_id: 'msw' } }), { status: 404 });
  }) as typeof fetch;
  return () => {
    global.fetch = original;
  };
}
