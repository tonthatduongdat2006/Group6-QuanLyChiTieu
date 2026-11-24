// UT-FE-SESSION (D-13a, AC-03) — kho bảo mật giả lập
import { SessionManager, REFRESH_TOKEN_KEY, type SecureStorage, type AuthTransport } from '../../src/api/session';
import { ApiError } from '../../src/api/errors';

class MemStorage implements SecureStorage {
  data = new Map<string, string>();
  async getItem(k: string) { return this.data.get(k) ?? null; }
  async setItem(k: string, v: string) { this.data.set(k, v); }
  async deleteItem(k: string) { this.data.delete(k); }
}
const tokens = (n: number) => ({ access_token: `a${n}`, refresh_token: `r${n}`, expires_in: 900 });

function setup(transport: Partial<AuthTransport> = {}) {
  const storage = new MemStorage();
  const t: AuthTransport = { refresh: jest.fn(async () => tokens(2)), logout: jest.fn(async () => undefined), ...transport };
  return { storage, t, s: new SessionManager(storage, t) };
}

describe('UT-FE-SESSION', () => {
  it('ghi nhớ BẬT: chỉ refresh token được lưu bền, access token không', async () => {
    const { storage, s } = setup();
    await s.signIn(tokens(1), true);
    expect(storage.data.get(REFRESH_TOKEN_KEY)).toBe('r1');
    expect([...storage.data.values()]).not.toContain('a1');
    expect(s.status).toBe('signedIn');
  });

  it('ghi nhớ TẮT: không lưu gì vào kho; mở lại app (instance mới) → phải đăng nhập', async () => {
    const { storage, t, s } = setup();
    await s.signIn(tokens(1), false);
    expect(storage.data.size).toBe(0);
    const reopened = new SessionManager(storage, t);
    expect(await reopened.restore()).toBe(false);
    expect(reopened.status).toBe('signedOut');
  });

  it('mở lại app với phiên đã ghi nhớ → refresh → vào app, lưu token đã xoay vòng', async () => {
    const { storage, t, s } = setup();
    await s.signIn(tokens(1), true);
    const reopened = new SessionManager(storage, t);
    expect(await reopened.restore()).toBe(true);
    expect(reopened.getAccessToken()).toBe('a2');
    expect(storage.data.get(REFRESH_TOKEN_KEY)).toBe('r2');
  });

  it('refresh bị thu hồi khi mở app → xóa kho, về Đăng nhập', async () => {
    const { storage, s } = setup({ refresh: jest.fn(async () => { throw new ApiError('UNAUTHORIZED', 401); }) });
    storage.data.set(REFRESH_TOKEN_KEY, 'revoked');
    expect(await s.restore()).toBe(false);
    expect(storage.data.size).toBe(0);
    expect(s.status).toBe('signedOut');
  });

  it('mất mạng khi mở app → chưa vào app nhưng GIỮ token đã ghi nhớ để thử lại', async () => {
    const { storage, s } = setup({ refresh: jest.fn(async () => { throw new ApiError('NETWORK_ERROR', 0); }) });
    storage.data.set(REFRESH_TOKEN_KEY, 'r1');
    expect(await s.restore()).toBe(false);
    expect(storage.data.get(REFRESH_TOKEN_KEY)).toBe('r1');
  });

  it('refresh single-flight: 5 lời gọi đồng thời → 1 request', async () => {
    const refresh = jest.fn(() => new Promise<ReturnType<typeof tokens>>((r) => setTimeout(() => r(tokens(3)), 5)));
    const { s } = setup({ refresh });
    await s.signIn(tokens(1), false);
    const out = await Promise.all([s.refresh(), s.refresh(), s.refresh(), s.refresh(), s.refresh()]);
    expect(out.every((o) => o === 'ok')).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('đăng xuất: xóa cả hai token, gọi server; server lỗi vẫn đăng xuất', async () => {
    const logout = jest.fn(async () => { throw new ApiError('NETWORK_ERROR', 0); });
    const { storage, s } = setup({ logout });
    await s.signIn(tokens(1), true);
    await s.signOut();
    expect(logout).toHaveBeenCalledWith('r1');
    expect(storage.data.size).toBe(0);
    expect(s.getAccessToken()).toBeNull();
    expect(s.status).toBe('signedOut');
  });

  it('listener nhận thay đổi trạng thái', async () => {
    const { s } = setup();
    const seen: string[] = [];
    s.subscribe((st) => seen.push(st));
    await s.signIn(tokens(1), false);
    await s.signOut({ callServer: false });
    expect(seen).toEqual(['signedIn', 'signedOut']);
  });
});
