// UT-VALID (AC-01, AC-02) + UT-AUTH-REFRESH (D-13b) + mật khẩu
import { validateRegister, normalizeEmail } from '../../src/modules/auth/auth-rules';
import { decideRefresh, hashRefreshToken, generateRefreshToken } from '../../src/modules/auth/tokens';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password';

const valid = { full_name: 'Nguyễn Văn A', email: 'User@Example.com ', password: 'Example123', phone: null, terms_accepted: true };
const fields = (input: object) => validateRegister(input as never).map((i) => i.field);

describe('UT-VALID đăng ký', () => {
  it('dữ liệu hợp lệ không có lỗi', () => expect(validateRegister(valid)).toEqual([]));
  it('email chuẩn hóa trim + lowercase', () => expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com'));
  it('email sai', () => expect(fields({ ...valid, email: 'abc@' })).toEqual(['email']));
  it('mật khẩu 7 ký tự bị từ chối, 8 ký tự được', () => {
    expect(fields({ ...valid, password: '1234567' })).toEqual(['password']);
    expect(fields({ ...valid, password: '12345678' })).toEqual([]);
  });
  it('thiếu đồng ý điều khoản', () => {
    expect(fields({ ...valid, terms_accepted: false })).toEqual(['terms_accepted']);
    expect(fields({ ...valid, terms_accepted: 'true' })).toEqual(['terms_accepted']);
  });
  it('họ tên rỗng', () => expect(fields({ ...valid, full_name: '   ' })).toEqual(['full_name']));
  it('số điện thoại sai', () => expect(fields({ ...valid, phone: 'abc' })).toEqual(['phone']));
});

describe('UT-AUTH-REFRESH decideRefresh', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  const future = new Date('2026-12-24T00:00:00Z');
  it('phiên còn hạn → ROTATE', () => expect(decideRefresh({ expiresAt: future, revokedAt: null }, now, 10).kind).toBe('ROTATE'));
  it('không có phiên → REJECT', () => expect(decideRefresh(null, now, 10).kind).toBe('REJECT'));
  it('hết hạn → REJECT', () =>
    expect(decideRefresh({ expiresAt: new Date('2026-11-23T00:00:00Z'), revokedAt: null }, now, 10).kind).toBe('REJECT'));
  it('vừa xoay vòng 3s trước (đua refresh) → RACE', () =>
    expect(decideRefresh({ expiresAt: future, revokedAt: new Date(now.getTime() - 3000) }, now, 10).kind).toBe('RACE'));
  it('token cũ dùng lại sau grace → REUSE_DETECTED', () =>
    expect(decideRefresh({ expiresAt: future, revokedAt: new Date(now.getTime() - 60000) }, now, 10).kind).toBe('REUSE_DETECTED'));
  it('token ngẫu nhiên, hash là 64 hex', () => {
    const t = generateRefreshToken();
    expect(t.length).toBeGreaterThan(40);
    expect(hashRefreshToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(generateRefreshToken()).not.toBe(t);
  });
});

describe('Mật khẩu (scrypt)', () => {
  const fast = { N: 2 ** 10, r: 8, p: 1 }; // tham số nhỏ cho test nhanh
  it('đúng mật khẩu → true, sai → false', async () => {
    const h = await hashPassword('Example123', fast);
    expect(h.startsWith('scrypt$1024$8$1$')).toBe(true);
    await expect(verifyPassword('Example123', h)).resolves.toBe(true);
    await expect(verifyPassword('Example124', h)).resolves.toBe(false);
  });
  it('2 lần băm cùng mật khẩu cho kết quả khác (salt)', async () => {
    expect(await hashPassword('x'.repeat(8), fast)).not.toBe(await hashPassword('x'.repeat(8), fast));
  });
  it('chuỗi hash hỏng → false, không ném lỗi', async () => {
    await expect(verifyPassword('a', 'bcrypt$xx')).resolves.toBe(false);
    await expect(verifyPassword('a', 'scrypt$0$0$0$a$b')).resolves.toBe(false);
  });
});
