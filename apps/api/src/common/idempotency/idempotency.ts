// P1-BE-03 — Idempotency theo API v1.1 §1.1 + ERD v1.1 §2 (D-05).
// - Key lưu DB = "<operation>:<client-key>" (operation namespace).
// - Request hash = SHA-256 hex của JSON chuẩn hóa (operation + path params + body).
// - Cùng key + cùng hash → trả kết quả cũ; cùng key + hash khác → 409 IDEMPOTENCY_KEY_REUSED.
import { createHash } from 'node:crypto';

/** Tên thao tác = namespace. Mỗi giá trị gắn với đúng 1 cặp cột trong ERD (backend-plan §3.1). */
export const IDEMPOTENT_OPERATIONS = {
  TRANSACTION_CREATE: 'transactions.create', // transactions.idempotency_key
  JAR_CREATE: 'saving_jars.create', // saving_jars.create_idempotency_key
  JAR_DEPOSIT: 'jar_transactions.deposit', // jar_transactions.idempotency_key
  JAR_WITHDRAW: 'jar_transactions.withdraw', // jar_transactions.idempotency_key
  AI_MESSAGE: 'ai_messages.create', // ai_messages.idempotency_key
  AI_SCAN: 'ai_draft_batches.scan', // ai_draft_batches.idempotency_key
  DRAFT_CONFIRM: 'ai_drafts.confirm', // ai_drafts.confirm_idempotency_key
  BATCH_CONFIRM_ALL: 'ai_draft_batches.confirm_all', // ai_draft_batches.confirm_all_idempotency_key
} as const;
export type IdempotentOperation = (typeof IDEMPOTENT_OPERATIONS)[keyof typeof IDEMPOTENT_OPERATIONS];

const CLIENT_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** Key client: 8–128 ký tự [A-Za-z0-9_-] (UUID hợp lệ). Trả null nếu sai. */
export function normalizeClientKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim();
  return CLIENT_KEY_RE.test(k) ? k : null;
}

export function namespacedKey(op: IdempotentOperation, clientKey: string): string {
  return `${op}:${clientKey}`;
}

/** JSON chuẩn hóa: khóa sắp xếp, bỏ undefined, bigint → chuỗi. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') return JSON.stringify(value.toString());
    if (value === undefined) return 'null';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Hash yêu cầu JSON: op + params đường dẫn + body đã chuẩn hóa nghiệp vụ. */
export function requestHash(op: IdempotentOperation, params: Record<string, unknown>, body: unknown): string {
  return sha256Hex(canonicalJson({ op, params, body }));
}

export type ReplayDecision = 'NEW' | 'REPLAY' | 'CONFLICT';

/** So hash lưu trong DB với hash yêu cầu hiện tại. */
export function decideReplay(stored: { requestHash: string | null } | null, currentHash: string): ReplayDecision {
  if (!stored) return 'NEW';
  return stored.requestHash === currentHash ? 'REPLAY' : 'CONFLICT';
}

/**
 * Single-flight trong tiến trình: các lời gọi đồng thời cùng key dùng chung 1 promise.
 * Lớp chốt cuối vẫn là unique index trong DB (nhiều instance không thể ghi trùng).
 */
export class SingleFlight<T> {
  private readonly inflight = new Map<string, Promise<T>>();

  run(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const p = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  get size(): number {
    return this.inflight.size;
  }
}
