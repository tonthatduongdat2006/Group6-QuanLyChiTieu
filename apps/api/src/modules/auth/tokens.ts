// Refresh token: 32 byte ngẫu nhiên (base64url). DB chỉ lưu SHA-256 hex (ERD §3.2, D-13b).
import { createHash, randomBytes } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export type RefreshDecision =
  | { kind: 'ROTATE' }
  | { kind: 'REJECT' } // không tồn tại / hết hạn
  | { kind: 'RACE' } // vừa bị xoay vòng trong khoảng grace → 401, không thu hồi toàn bộ
  | { kind: 'REUSE_DETECTED' }; // token cũ bị dùng lại → thu hồi mọi phiên của user

export interface SessionSnapshot {
  expiresAt: Date;
  revokedAt: Date | null;
}

/** Quyết định thuần cho /auth/refresh — tách riêng để unit test (UT-AUTH-REFRESH). */
export function decideRefresh(session: SessionSnapshot | null, now: Date, graceSeconds: number): RefreshDecision {
  if (!session) return { kind: 'REJECT' };
  if (session.revokedAt) {
    const sinceRevoke = (now.getTime() - session.revokedAt.getTime()) / 1000;
    return sinceRevoke <= graceSeconds ? { kind: 'RACE' } : { kind: 'REUSE_DETECTED' };
  }
  if (session.expiresAt.getTime() <= now.getTime()) return { kind: 'REJECT' };
  return { kind: 'ROTATE' };
}
