// P1-FE-04 — HTTP client: gắn Bearer, bóc envelope, ánh xạ lỗi, 401 → refresh (single-flight) → thử lại 1 lần.
// TS thuần, không import React Native → unit test được (UT-FE-HTTP).
import { ApiError, type ApiErrorCode, type ApiErrorDetail } from './errors';

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  idempotencyKey?: string | null;
  /** false cho /auth/* */
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ApiResult<T> {
  data: T;
  meta?: { page: number; page_size: number; total: number; total_pages: number };
}

export interface SessionPort {
  getAccessToken(): string | null;
  refresh(): Promise<'ok' | 'invalid' | 'network'>;
  signOut(opts?: { callServer?: boolean }): Promise<void>;
}

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  if (!query) return url;
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${url}?${qs}` : url;
}

/** Gửi 1 request, không xử lý refresh. Dùng trực tiếp cho /auth/*. */
export async function sendRaw<T>(
  fetchFn: FetchFn,
  baseUrl: string,
  method: Method,
  path: string,
  opts: RequestOptions & { accessToken?: string | null } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  // multipart (ảnh hóa đơn): để fetch tự đặt Content-Type kèm boundary
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (opts.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetchFn(buildUrl(baseUrl, path, opts.query), {
      method,
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError('NETWORK_ERROR', 0);
  }

  if (res.status === 204) return { data: undefined as T };
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.ok) {
    const env = (json ?? {}) as { data: T; meta?: ApiResult<T>['meta'] };
    return { data: env.data, meta: env.meta };
  }
  const err = (json as { error?: { code?: string; message?: string; details?: ApiErrorDetail[]; request_id?: string } })?.error;
  throw new ApiError((err?.code as ApiErrorCode) ?? 'UNKNOWN', res.status, err?.message, err?.details ?? [], err?.request_id);
}

export function createHttpClient(deps: { baseUrl: string; fetch: FetchFn; session: SessionPort }) {
  async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    if (opts.auth === false) return sendRaw<T>(deps.fetch, deps.baseUrl, method, path, opts);

    const usedToken = deps.session.getAccessToken();
    try {
      return await sendRaw<T>(deps.fetch, deps.baseUrl, method, path, { ...opts, accessToken: usedToken });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
    }
    // 401: nếu token đã được làm mới bởi request khác trong lúc chờ → chỉ thử lại; nếu không → refresh
    if (deps.session.getAccessToken() === usedToken) {
      const r = await deps.session.refresh();
      if (r === 'network') throw new ApiError('NETWORK_ERROR', 0);
      if (r === 'invalid') {
        await deps.session.signOut({ callServer: false });
        throw new ApiError('UNAUTHORIZED', 401);
      }
    }
    // Thử lại đúng 1 lần, CÙNG Idempotency-Key (cùng ý định)
    try {
      return await sendRaw<T>(deps.fetch, deps.baseUrl, method, path, { ...opts, accessToken: deps.session.getAccessToken() });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await deps.session.signOut({ callServer: false });
      throw e;
    }
  }

  return {
    request,
    get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
    post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
    put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
    patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
    delete: <T = void>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
