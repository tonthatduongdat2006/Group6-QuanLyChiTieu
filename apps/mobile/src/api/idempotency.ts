// Vòng đời Idempotency-Key theo ý định người dùng (frontend-plan §5, R-24):
// - sinh khi bắt đầu ý định (mở form/bấm gửi/chọn ảnh/bấm xác nhận)
// - GIỮ NGUYÊN cho mọi lần thử lại cùng nội dung (timeout, mất mạng, 5xx, 401→refresh)
// - sinh MỚI khi nội dung đổi hoặc sau khi thành công
export type UuidFn = () => string;

/** JSON ổn định (khóa sắp xếp ở mọi cấp) để so sánh nội dung. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

export class IntentKey {
  private key: string | null = null;
  private fingerprint: string | null = null;
  private readonly uuid: UuidFn;

  constructor(uuid: UuidFn) {
    this.uuid = uuid;
  }

  /** Key cho payload hiện tại: cùng payload → cùng key; payload khác → key mới. */
  forPayload(payload: unknown): string {
    const fp = stableStringify(payload);
    if (this.key === null || fp !== this.fingerprint) {
      this.key = this.uuid();
      this.fingerprint = fp;
    }
    return this.key;
  }

  /** Gọi sau khi server báo thành công (hoặc 409 IDEMPOTENCY_KEY_REUSED). */
  reset(): void {
    this.key = null;
    this.fingerprint = null;
  }

  get current(): string | null {
    return this.key;
  }
}
