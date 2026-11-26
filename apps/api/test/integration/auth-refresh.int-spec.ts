// IT-AUTH-REFRESH — 5 ca bắt buộc (planning-mvp.md §6, quyết định QB / D-28): refresh xoay vòng, grace 10 s,
// trong grace chỉ trả 401 (không cấp token, không tạo phiên), sau grace thu hồi mọi phiên.
import { createTestApp, parallel, resetDb, type TestContext } from '../helpers/app';
import { registerAndLogin } from '../helpers/factories';

const GRACE = Number(process.env.REFRESH_REUSE_GRACE_SECONDS ?? 10);

describe('IT-AUTH-REFRESH', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx.prisma));

  const refresh = (token: string) => ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: token });
  const activeSessions = (userId: string) => ctx.prisma.authSession.count({ where: { userId, revokedAt: null } });
  const allSessions = (userId: string) => ctx.prisma.authSession.count({ where: { userId } });

  it('(1) 5 refresh song song cùng token → đúng 1 thành công, không thu hồi toàn bộ', async () => {
    const u = await registerAndLogin(ctx);
    const results = await parallel(5, () => refresh(u.refreshToken));
    const ok = results.filter((r) => r.status === 200);
    expect(ok).toHaveLength(1);
    expect(results.filter((r) => r.status === 401)).toHaveLength(4);
    expect(await activeSessions(u.id)).toBe(1);
    // phiên còn sống là phiên mới vừa cấp → token mới dùng được
    await refresh(ok[0]!.body.data.refresh_token).expect(200);
  });

  it('(2) dùng lại token cũ TRONG grace, lặp nhiều lần → luôn 401, không phiên mới, không token mới', async () => {
    const u = await registerAndLogin(ctx);
    const rotated = await refresh(u.refreshToken).expect(200);
    const before = await allSessions(u.id);
    for (let i = 0; i < 5; i++) {
      ctx.clock.advance(1); // vẫn trong grace (tổng 5 s < GRACE)
      const res = await refresh(u.refreshToken);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.data).toBeUndefined();
    }
    expect(5).toBeLessThan(GRACE);
    expect(await allSessions(u.id)).toBe(before); // không tạo phiên
    expect(await activeSessions(u.id)).toBe(1); // không thu hồi toàn bộ
    await refresh(rotated.body.data.refresh_token).expect(200); // phiên hợp lệ vẫn dùng được
  });

  it('(3) dùng lại token cũ SAU grace → 401 + mọi phiên của user bị thu hồi', async () => {
    const u = await registerAndLogin(ctx);
    const other = await ctx.http().post('/api/v1/auth/login').send({ email: u.email, password: u.password }).expect(200);
    const rotated = await refresh(u.refreshToken).expect(200);
    ctx.clock.advance(GRACE + 1);
    await refresh(u.refreshToken).expect(401);
    expect(await activeSessions(u.id)).toBe(0);
    await refresh(rotated.body.data.refresh_token).expect(401);
    await refresh(other.body.data.refresh_token).expect(401);
    await ctx.http().get('/api/v1/users/me').set({ Authorization: `Bearer ${other.body.data.access_token}` }).expect(401);
  });

  it('(4) logout → refresh bằng token đó → 401; sau grace → thu hồi mọi phiên', async () => {
    const u = await registerAndLogin(ctx);
    const other = await ctx.http().post('/api/v1/auth/login').send({ email: u.email, password: u.password }).expect(200);
    await ctx.http().post('/api/v1/auth/logout').send({ refresh_token: u.refreshToken }).expect(200);

    await refresh(u.refreshToken).expect(401); // trong grace: chỉ 401
    expect(await activeSessions(u.id)).toBe(1); // phiên kia còn
    const before = await allSessions(u.id);

    ctx.clock.advance(GRACE + 1);
    await refresh(u.refreshToken).expect(401); // sau grace: coi như token bị lộ
    expect(await activeSessions(u.id)).toBe(0);
    expect(await allSessions(u.id)).toBe(before); // không cấp phiên mới
    await refresh(other.body.data.refresh_token).expect(401);
  });

  it('(5) access token của phiên đã xoay vòng → 401; access token mới → 200', async () => {
    const u = await registerAndLogin(ctx);
    const rotated = await refresh(u.refreshToken).expect(200);
    const res = await ctx.http().get('/api/v1/users/me').set(u.auth);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    await ctx.http().get('/api/v1/users/me').set({ Authorization: `Bearer ${rotated.body.data.access_token}` }).expect(200);
  });
});
