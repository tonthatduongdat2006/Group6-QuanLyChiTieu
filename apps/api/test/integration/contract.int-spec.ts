// IT-CONTRACT (P1-SH-02) — mỗi phase thêm case cho endpoint mới
import { createTestApp, resetDb, type TestContext } from '../helpers/app';
import { registerAndLogin } from '../helpers/factories';
import { expectMatchesSpec } from '../helpers/contract';

describe('IT-CONTRACT Phase 1', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx.prisma));

  const body = { full_name: 'A', email: 'c@test.vn', password: 'Example123', phone: null, terms_accepted: true };

  it('register 201 / 409 / 422', async () => {
    const path = '/api/v1/auth/register';
    expectMatchesSpec('POST', path, await ctx.http().post(path).send(body));
    expectMatchesSpec('POST', path, await ctx.http().post(path).send(body));
    expectMatchesSpec('POST', path, await ctx.http().post(path).send({ ...body, email: 'bad' }));
  });

  it('login 200 / 401, refresh 200 / 401, logout 200', async () => {
    await ctx.http().post('/api/v1/auth/register').send(body);
    const ok = await ctx.http().post('/api/v1/auth/login').send({ email: body.email, password: body.password });
    expectMatchesSpec('POST', '/api/v1/auth/login', ok);
    expectMatchesSpec('POST', '/api/v1/auth/login', await ctx.http().post('/api/v1/auth/login').send({ email: body.email, password: 'x' }));
    const rt = ok.body.data.refresh_token;
    const r = await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: rt });
    expectMatchesSpec('POST', '/api/v1/auth/refresh', r);
    expectMatchesSpec('POST', '/api/v1/auth/refresh', await ctx.http().post('/api/v1/auth/refresh').send({ refresh_token: 'nope' }));
    expectMatchesSpec('POST', '/api/v1/auth/logout', await ctx.http().post('/api/v1/auth/logout').send({ refresh_token: r.body.data.refresh_token }));
  });

  it('users/me GET 200 / 401, PATCH 200 / 422', async () => {
    const u = await registerAndLogin(ctx);
    expectMatchesSpec('GET', '/api/v1/users/me', await ctx.http().get('/api/v1/users/me').set(u.auth));
    expectMatchesSpec('GET', '/api/v1/users/me', await ctx.http().get('/api/v1/users/me'));
    expectMatchesSpec('PATCH', '/api/v1/users/me', await ctx.http().patch('/api/v1/users/me').set(u.auth).send({ phone: '0901234567' }));
    expectMatchesSpec('PATCH', '/api/v1/users/me', await ctx.http().patch('/api/v1/users/me').set(u.auth).send({}));
  });
});
