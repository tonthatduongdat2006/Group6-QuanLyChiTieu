// Chặn mọi kết nối mạng ra ngoài trong test (chỉ cho localhost/DB). Nếu code lỡ gọi Claude thật → test fail ngay.
import http from 'node:http';
import https from 'node:https';

const ALLOWED = new Set(['localhost', '127.0.0.1', '::1', undefined, '']);
function guard(original: typeof http.request) {
  return function patched(this: unknown, ...args: Parameters<typeof http.request>) {
    const opt = args[0] as { hostname?: string; host?: string } | string | URL;
    const host = typeof opt === 'string' ? new URL(opt).hostname : opt instanceof URL ? opt.hostname : opt.hostname ?? opt.host;
    if (!ALLOWED.has(host)) throw new Error(`Test đã cố gọi mạng ra ngoài: ${host}`);
    return original.apply(this, args);
  } as typeof http.request;
}
http.request = guard(http.request);
https.request = guard(https.request);
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (!ALLOWED.has(url.hostname)) throw new Error(`Test đã cố gọi mạng ra ngoài: ${url.hostname}`);
  return realFetch(input, init);
}) as typeof fetch;
