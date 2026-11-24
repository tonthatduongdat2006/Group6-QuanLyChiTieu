// UT-FE-HTTP — 401 → refresh → retry; refresh thất bại → đăng xuất; envelope/lỗi
import { createHttpClient, type SessionPort, type FetchFn } from '../../src/api/http';
import { ApiError } from '../../src/api/errors';

const json = (status: number, body: unknown) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as unknown as Response;

function fakeSession(initial = 'a1', refreshResult: 'ok' | 'invalid' | 'network' = 'ok') {
  let token: string | null = initial;
  const s = {
    getAccessToken: () => token,
    refresh: jest.fn(async () => { if (refreshResult === 'ok') token = 'a2'; return refreshResult; }),
    signOut: jest.fn(async () => { token = null; }),
  };
  return s as SessionPort & { refresh: ReturnType<typeof jest.fn>; signOut: ReturnType<typeof jest.fn> };
}

describe('UT-FE-HTTP', () => {
  it('bóc { data, meta }, gắn Bearer + Idempotency-Key + query', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetch: FetchFn = async (url, init) => { calls.push({ url, init }); return json(200, { data: [1], meta: { page: 1, page_size: 20, total: 1, total_pages: 1 } }); };
    const http = createHttpClient({ baseUrl: 'http://x/api/v1/', fetch, session: fakeSession() });
    const r = await http.get<number[]>('/transactions', { query: { month: '2026-11', type: undefined }, idempotencyKey: 'k-12345678' });
    expect(r.data).toEqual([1]);
    expect(r.meta?.total).toBe(1);
    expect(calls[0]!.url).toBe('http://x/api/v1/transactions?month=2026-11');
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer a1');
    expect(h['Idempotency-Key']).toBe('k-12345678');
  });

  it('lỗi server → ApiError đúng code/details/request_id', async () => {
    const fetch: FetchFn = async () => json(422, { error: { code: 'INSUFFICIENT_BALANCE', message: 'Số dư khả dụng không đủ', details: [{ field: 'amount', message: 'x' }], request_id: 'r1' } });
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session: fakeSession() });
    try {
      await http.post('/transactions', {});
      throw new Error('lẽ ra phải lỗi');
    } catch (e) {
      expect(e instanceof ApiError).toBe(true);
      const err = e as ApiError;
      expect(err.code).toBe('INSUFFICIENT_BALANCE');
      expect(err.fieldErrors()).toEqual({ amount: 'x' });
      expect(err.requestId).toBe('r1');
      expect(err.retryable).toBe(false);
    }
  });

  it('401 → refresh → thử lại với token mới và CÙNG Idempotency-Key', async () => {
    const seen: { auth?: string; key?: string }[] = [];
    const fetch: FetchFn = async (_u, init) => {
      const h = init.headers as Record<string, string>;
      seen.push({ auth: h.Authorization, key: h['Idempotency-Key'] });
      return h.Authorization === 'Bearer a1' ? json(401, { error: { code: 'UNAUTHORIZED' } }) : json(201, { data: { id: 't1' } });
    };
    const session = fakeSession();
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session });
    const r = await http.post<{ id: string }>('/transactions', { amount: '1' }, { idempotencyKey: 'same-key-1' });
    expect(r.data.id).toBe('t1');
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([{ auth: 'Bearer a1', key: 'same-key-1' }, { auth: 'Bearer a2', key: 'same-key-1' }]);
  });

  it('refresh bị từ chối → đăng xuất, ném UNAUTHORIZED', async () => {
    const fetch: FetchFn = async () => json(401, { error: { code: 'UNAUTHORIZED' } });
    const session = fakeSession('a1', 'invalid');
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session });
    await expect(http.get('/users/me')).rejects.toThrow(ApiError);
    expect(session.signOut).toHaveBeenCalledTimes(1);
  });

  it('mất mạng → NETWORK_ERROR (retryable)', async () => {
    const fetch: FetchFn = async () => { throw new TypeError('Network request failed'); };
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session: fakeSession() });
    try { await http.get('/users/me'); } catch (e) { expect((e as ApiError).code).toBe('NETWORK_ERROR'); expect((e as ApiError).retryable).toBe(true); }
  });

  it('204 → data undefined', async () => {
    const fetch: FetchFn = async () => ({ status: 204, ok: true }) as Response;
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session: fakeSession() });
    expect((await http.delete('/budgets/1')).data).toBeUndefined();
  });

  it('auth:false không gắn Bearer, không refresh', async () => {
    let auth: string | undefined;
    const fetch: FetchFn = async (_u, init) => { auth = (init.headers as Record<string, string>).Authorization; return json(401, { error: { code: 'UNAUTHORIZED', message: 'Email hoặc mật khẩu không đúng' } }); };
    const session = fakeSession();
    const http = createHttpClient({ baseUrl: 'http://x', fetch, session });
    await expect(http.post('/auth/login', {}, { auth: false })).rejects.toThrow('Email hoặc mật khẩu không đúng');
    expect(auth).toBeUndefined();
    expect(session.refresh).toHaveBeenCalledTimes(0);
  });
});
