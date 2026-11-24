// IT-AUTH — AC-01, AC-02, AC-03, NFR-SEC (P1-BE-04)
import { createTestApp, parallel, resetDb, type TestContext } from '../helpers/app';
import { registerAndLogin } from '../helpers/factories';
import { DEFAULT_CATEGORIES } from '../../src/modules/category/category-rules';

const base = { full_name: 'Nguyễn Văn A', email: 'a@test.vn', password: 'Example123', phone: null, terms_accepted: true };

describe('IT-AUTH', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx.prisma));

  describe('POST /auth/register', () => {
    it('AC-01: tạo user + danh mục mặc định trong cùng transaction, không trả hash', async () => {
      const res = await ctx.http().post('/api/v1/auth/register').send({ ...base, email: ' A@Test.VN ' });
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({ id: expect.any(String), full_name: 'Nguyễn Văn A', email: 'a@test.vn', phone: null });
      expect(JSON.stringify(res.body)).not.toMatch(/password|scrypt/);
      const cats = await ctx.prisma.category.findMany({ where: { userId: res.body.data.id } });
      expect(cats).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(cats.every((c) => c.isDefault)).toBe(true);
      const u = await ctx.prisma.user.findUniqueOrThrow({ where: { id: res.body.data.id } });
      expect(u.passwordHash.startsWith('scrypt$')).toBe(true);
    });

    it.each([
      ['email sai định dạng', { email: 'abc' }, 'email'],
      ['mật khẩu 7 ký tự', { password: '1234567' }, 'password'],
      ['chưa đồng ý điều khoản', { terms_accepted: false }, 'terms_accepted'],
    ])('AC-02: từ chối %s → 422', async (_n, patch, field) => {
      const res = await ctx.http().post('/api/v1/auth/register').send({ ...base, ...patch });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
      expect(await ctx.prisma.user.count()).toBe(0);
    });

    it('AC-02: email trùng (khác hoa/thường) → 409 CONFLICT, không tạo danh mục thừa', async () => {
      await ctx.http().post('/api/v1/auth/register').send(base).expect(201);
      const res = await ctx.http().post('/api/v1/auth/register').send({ ...base, email: 'A@TEST.vn' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(await ctx.prisma.category.count()).toBe(DEFAULT_CATEGORIES.length);
    });

    it('trường lạ bị từ chối (whitelist), user_id client không được tin', async () => {
      const res = await ctx.http().post('/api/v1/auth/register').send({ ...base, user_id: 'x', is_admin: true });
      expect(res.status).toBe(422);
    });
  });

  describe('login / refresh / logout', () => {
    it('AC-03: đăng nhập trả cặp token; sai mật khẩu và email lạ cùng thông báo chung', async () => {
      await ctx.http().post('/api/v1/auth/register').send(base).expect(201);
      const ok = await ctx.http().post('/api/v1/auth/login').send({ email: 'a@test.vn', password: 'Example123', remember_me: true });
      expect(ok.status).toBe(200);
      expect(ok.body.data).toEqual({ access_token: expect.any(String), refresh_token: expect.any(String), token_type: 'Bearer', expires_in: 900 });

      const wrongPw = await ctx.http().post('/api/v1/auth/login').send({ email: 'a@test.vn', password: 'WrongPass1' });
      const noUser = await ctx.http().post('/api/v1/auth/login').send({ email: 'nobody@test.vn', password: 'WrongPass1' });
      expect(wrongPw.status).toBe(401);
      expect(noUser.status).toBe(401);
      expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
    });

    it('chỉ lưu hash của refresh token', async () => {
      const u = await registerAndLogin(ctx);
      const sessions = await ctx.prisma.authSession.findMany({ where: { userId: u.id } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(sessions[0].refreshTokenHash).not.toBe(u.refreshToken);
    });

    it('refresh xoay vòng: token mới dùng được, access token cũ hết hiệu lực', async () => {
      const u = await registerAndLogin(ctx);
      const r = await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken });
      expect(r.status).toBe(200);
      expect(r.body.data.refresh_token).not.toBe(u.refreshToken);
      await ctx.http().get('/api/v1/users/me').set(u.auth).expect(401);
      await ctx.http().get('/api/v1/users/me').set({ Authorization: `Bearer ${r.body.data.access_token}` }).expect(200);
    });

    it('dùng lại refresh token cũ sau grace → thu hồi MỌI phiên của user', async () => {
      const u = await registerAndLogin(ctx);
      const r = await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken }).expect(200);
      ctx.clock.advance(60);
      await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken }).expect(401);
      // token mới (hợp lệ) cũng đã bị thu hồi
      await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: r.body.data.refresh_token }).expect(401);
      expect(await ctx.prisma.authSession.count({ where: { userId: u.id, revokedAt: null } })).toBe(0);
    });

    it('refresh hết hạn → 401', async () => {
      const u = await registerAndLogin(ctx);
      ctx.clock.advance(31 * 24 * 3600);
      await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken }).expect(401);
    });

    it('IT-CONC (mẫu harness): 5 refresh song song cùng token → đúng 1 thành công, không thu hồi toàn bộ', async () => {
      const u = await registerAndLogin(ctx);
      const results = await parallel(5, () => ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken }));
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 401)).toHaveLength(4);
      expect(await ctx.prisma.authSession.count({ where: { userId: u.id, revokedAt: null } })).toBe(1);
    });

    it('AC-03: logout thu hồi phiên ngay (access token không dùng được nữa); gọi lại vẫn 200', async () => {
      const u = await registerAndLogin(ctx);
      await ctx.http().post('/api/v1/auth/logout').send({ refresh_token: u.refreshToken }).expect(200);
      await ctx.http().get('/api/v1/users/me').set(u.auth).expect(401);
      await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: u.refreshToken }).expect(401);
      await ctx.http().post('/api/v1/auth/logout').send({ refresh_token: u.refreshToken }).expect(200);
    });

    it('access token sai chữ ký / thiếu → 401 UNAUTHORIZED', async () => {
      await ctx.http().get('/api/v1/users/me').expect(401);
      const res = await ctx.http().get('/api/v1/users/me').set({ Authorization: 'Bearer abc.def.ghi' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
