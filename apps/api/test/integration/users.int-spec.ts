// IT-USER (P1-BE-05) + IT-ENVELOPE (P1-BE-02) + nền IT-AUTHZ (P1-SH-01)
import { createTestApp, resetDb, type TestContext } from '../helpers/app';
import { registerAndLogin } from '../helpers/factories';
import { expectRequiresAuth } from '../helpers/authz-matrix';

describe('IT-USER /users/me', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());
  beforeEach(async () => resetDb(ctx.prisma));

  it('GET trả hồ sơ của chính mình', async () => {
    const u = await registerAndLogin(ctx, { full_name: 'Trần B' });
    const res = await ctx.http().get('/api/v1/users/me').set(u.auth).expect(200);
    expect(res.body.data).toEqual({ id: u.id, full_name: 'Trần B', email: u.email, phone: null });
  });

  it('PATCH chỉ đổi full_name/phone; email trong body bị từ chối', async () => {
    const u = await registerAndLogin(ctx);
    const ok = await ctx.http().patch('/api/v1/users/me').set(u.auth).send({ full_name: ' Lê C ', phone: '0901234567' }).expect(200);
    expect(ok.body.data).toMatchObject({ full_name: 'Lê C', phone: '0901234567' });
    await ctx.http().patch('/api/v1/users/me').set(u.auth).send({ email: 'x@y.vn' }).expect(422);
    await ctx.http().patch('/api/v1/users/me').set(u.auth).send({}).expect(422);
    await ctx.http().patch('/api/v1/users/me').set(u.auth).send({ phone: null }).expect(200);
  });

  it('dữ liệu user A và B tách biệt', async () => {
    const a = await registerAndLogin(ctx);
    const b = await registerAndLogin(ctx);
    const res = await ctx.http().get('/api/v1/users/me').set(b.auth).expect(200);
    expect(res.body.data.id).toBe(b.id);
    expect(res.body.data.id).not.toBe(a.id);
  });
});

describe('IT-ENVELOPE', () => {
  let ctx: TestContext;
  beforeAll(async () => (ctx = await createTestApp()));
  afterAll(async () => ctx.close());

  it('thành công: { data }; có X-Request-Id', async () => {
    const res = await ctx.http().get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ data: { status: 'ok' } });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('lỗi: { error: { code, message, request_id } }, không lộ stack', async () => {
    const res = await ctx.http().get('/api/v1/khong-ton-tai').set('X-Request-Id', 'req-12345678');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', request_id: 'req-12345678' });
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts|stack|prisma/i);
  });

  it('JSON hỏng → 400 BAD_REQUEST', async () => {
    const res = await ctx.http().post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('IT-AUTHZ nền: endpoint không public đòi Bearer', async () => {
    await expectRequiresAuth(ctx, [
      { name: 'GET /users/me', method: 'get', path: '/api/v1/users/me' },
      { name: 'PATCH /users/me', method: 'patch', path: '/api/v1/users/me', body: { full_name: 'x' } },
    ]);
  });
});
