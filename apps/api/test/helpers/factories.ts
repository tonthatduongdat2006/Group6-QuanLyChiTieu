// Factory dữ liệu test. User được tạo QUA API đăng ký thật (để có danh mục mặc định như thực tế).
import { randomUUID } from 'node:crypto';
import type { TestContext } from './app';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  auth: { Authorization: string };
}

let seq = 0;
export async function registerAndLogin(ctx: TestContext, overrides: Partial<{ email: string; full_name: string }> = {}): Promise<TestUser> {
  seq += 1;
  const email = overrides.email ?? `user${seq}-${randomUUID().slice(0, 6)}@test.vn`;
  const password = 'Example123';
  const reg = await ctx.http().post('/api/v1/auth/register').send({
    full_name: overrides.full_name ?? `Người dùng ${seq}`,
    email,
    password,
    phone: null,
    terms_accepted: true,
  });
  if (reg.status !== 201) throw new Error(`register failed ${reg.status} ${JSON.stringify(reg.body)}`);
  const login = await ctx.http().post('/api/v1/auth/login').send({ email, password });
  if (login.status !== 200) throw new Error(`login failed ${login.status}`);
  const { access_token, refresh_token } = login.body.data;
  return {
    id: reg.body.data.id,
    email,
    password,
    accessToken: access_token,
    refreshToken: refresh_token,
    auth: { Authorization: `Bearer ${access_token}` },
  };
}

export const idemKey = () => randomUUID();
