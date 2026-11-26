// P1-BE-02 — validate env khi khởi động
import { loadConfig } from '../../src/common/config/env';

const ok = { DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'x'.repeat(32) };

describe('loadConfig', () => {
  it('giá trị mặc định hợp lý', () => {
    const c = loadConfig(ok);
    expect(c.jwtAccessTtlSeconds).toBe(900);
    expect(c.aiProvider).toBe('fake');
    expect(c.corsOrigins).toEqual([]);
  });
  it('thiếu biến bắt buộc → lỗi liệt kê đủ, không in giá trị secret', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL là bắt buộc');
    expect(() => loadConfig({ ...ok, JWT_ACCESS_SECRET: 'short-secret' })).toThrow('ít nhất 32');
    try { loadConfig({ ...ok, JWT_ACCESS_SECRET: 'short-secret' }); } catch (e) { expect(String(e)).not.toMatch('short-secret'); }
  });
  it('test bắt buộc fake provider; claude cần API key', () => {
    expect(() => loadConfig({ ...ok, NODE_ENV: 'test', AI_PROVIDER: 'claude', AI_API_KEY: 'k' })).toThrow('AI_PROVIDER=fake');
    expect(() => loadConfig({ ...ok, AI_PROVIDER: 'claude' })).toThrow('AI_API_KEY');
  });
  it('số không hợp lệ bị từ chối', () => {
    expect(() => loadConfig({ ...ok, JWT_ACCESS_TTL: 'abc' })).toThrow('JWT_ACCESS_TTL');
  });
});
