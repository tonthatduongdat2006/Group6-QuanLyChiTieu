// NFR-PRI/NFR-SEC — che dữ liệu nhạy cảm trước khi log (backend-plan §8).
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'password_hash',
  'passwordhash',
  'refresh_token',
  'refreshtoken',
  'access_token',
  'accesstoken',
  'ai_api_key',
  'x-api-key',
  'api_key',
  'image',
  'file',
  'buffer',
]);
export const REDACTED = '[REDACTED]';

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[DEPTH]';
  if (value === null || typeof value !== 'object') return value;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return REDACTED;
  if (value instanceof Uint8Array) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}
