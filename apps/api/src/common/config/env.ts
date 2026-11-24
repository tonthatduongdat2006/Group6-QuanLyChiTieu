// Validate biến môi trường khi khởi động (P1-BE-02). Thiếu/sai → dừng app với thông báo rõ, không in giá trị secret.
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtAccessTtlSeconds: number;
  refreshTtlSeconds: number;
  refreshReuseGraceSeconds: number;
  aiProvider: 'fake' | 'claude';
  /** Chỉ dùng ở adapter Claude phía backend; không bao giờ trả ra client hay ghi log. */
  aiApiKey: string;
  aiModelScan: string;
  aiTimeoutMs: number;
  aiMaxRetries: number;
  receiptMaxBytes: number;
  receiptAllowedMime: string[];
  scanLimitPerHour: number;
  corsOrigins: string[];
  throttleTtlMs: number;
  throttleLimit: number;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const errors: string[] = [];
  const str = (k: string, required = true): string => {
    const v = env[k]?.trim() ?? '';
    if (required && !v) errors.push(`${k} là bắt buộc`);
    return v;
  };
  const int = (k: string, def: number, min = 1): number => {
    const raw = env[k];
    if (raw === undefined || raw === '') return def;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min) errors.push(`${k} phải là số nguyên ≥ ${min}`);
    return n;
  };
  const nodeEnv = (env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];
  if (!['development', 'test', 'production'].includes(nodeEnv)) errors.push('NODE_ENV không hợp lệ');

  const jwtAccessSecret = str('JWT_ACCESS_SECRET');
  if (jwtAccessSecret && jwtAccessSecret.length < 32) errors.push('JWT_ACCESS_SECRET phải dài ít nhất 32 ký tự');

  const aiProvider = (env.AI_PROVIDER ?? 'fake') as AppConfig['aiProvider'];
  if (!['fake', 'claude'].includes(aiProvider)) errors.push('AI_PROVIDER phải là fake hoặc claude');
  if (aiProvider === 'claude' && !env.AI_API_KEY) errors.push('AI_API_KEY là bắt buộc khi AI_PROVIDER=claude');
  if (nodeEnv === 'test' && aiProvider !== 'fake') errors.push('Môi trường test bắt buộc AI_PROVIDER=fake');
  // Fake provider chỉ để test/dev cục bộ — production phải dùng Claude thật (không dùng dữ liệu giả cho người dùng thật)
  // MVP demo: cho phép fake AI trên Production khi chưa cấu hình Claude API.

  const cfg: AppConfig = {
    nodeEnv,
    port: int('PORT', 3000),
    databaseUrl: str('DATABASE_URL'),
    jwtAccessSecret,
    jwtAccessTtlSeconds: int('JWT_ACCESS_TTL', 900, 60),
    refreshTtlSeconds: int('REFRESH_TTL', 30 * 24 * 3600, 3600),
    refreshReuseGraceSeconds: int('REFRESH_REUSE_GRACE_SECONDS', 10, 0),
    aiProvider,
    aiApiKey: env.AI_API_KEY?.trim() ?? '',
    aiModelScan: env.AI_MODEL_SCAN?.trim() || 'claude-opus-5-5',
    aiTimeoutMs: int('AI_TIMEOUT_MS', 60_000, 1000),
    aiMaxRetries: int('AI_MAX_RETRIES', 1, 0),
    // QD (D-28): 4 MB sau khi client nén
    receiptMaxBytes: int('RECEIPT_MAX_BYTES', 4 * 1024 * 1024, 1024),
    receiptAllowedMime: (env.RECEIPT_ALLOWED_MIME ?? 'image/jpeg,image/png,image/webp').split(',').map((s) => s.trim()).filter(Boolean),
    // QD (D-28): quét hóa đơn 20 lần/giờ/người dùng
    scanLimitPerHour: int('SCAN_LIMIT_PER_HOUR', 20, 1),
    corsOrigins: (env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    throttleTtlMs: int('THROTTLE_TTL_MS', 60_000),
    throttleLimit: int('THROTTLE_LIMIT', 60),
  };
  if (errors.length) throw new Error(`Cấu hình môi trường không hợp lệ:\n- ${errors.join('\n- ')}`);
  return cfg;
}

export const APP_CONFIG = Symbol('APP_CONFIG');
