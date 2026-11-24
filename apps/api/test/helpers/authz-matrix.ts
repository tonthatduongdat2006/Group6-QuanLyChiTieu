// P1-SH-01 — "User B truy cập tài nguyên của A → 404" dùng lại cho mọi endpoint (IT-AUTHZ).
// Mỗi module ở Phase 2/3 thêm case vào danh sách của nó rồi gọi expectCrossUserDenied.
import type { TestContext } from './app';
import type { TestUser } from './factories';

export interface AuthzCase {
  name: string;
  method: 'get' | 'post' | 'patch' | 'delete';
  /** path chứa id tài nguyên của user A */
  path: string;
  body?: object;
  headers?: Record<string, string>;
}

export async function expectCrossUserDenied(ctx: TestContext, intruder: TestUser, cases: AuthzCase[]): Promise<void> {
  const failures: string[] = [];
  for (const c of cases) {
    const res = await ctx.http()[c.method](c.path).set({ ...intruder.auth, ...(c.headers ?? {}) }).send(c.body ?? {});
    if (res.status !== 404 || res.body?.error?.code !== 'NOT_FOUND') failures.push(`${c.name}: ${res.status} ${res.body?.error?.code}`);
  }
  if (failures.length) throw new Error(`Rò rỉ quyền truy cập chéo:\n${failures.join('\n')}`);
}

/** Mọi endpoint không @Public phải trả 401 khi thiếu Bearer. */
export async function expectRequiresAuth(ctx: TestContext, cases: Omit<AuthzCase, 'headers'>[]): Promise<void> {
  const failures: string[] = [];
  for (const c of cases) {
    const res = await ctx.http()[c.method](c.path).send(c.body ?? {});
    if (res.status !== 401) failures.push(`${c.name}: ${res.status}`);
  }
  if (failures.length) throw new Error(`Endpoint không yêu cầu đăng nhập:\n${failures.join('\n')}`);
}
