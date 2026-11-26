// API Auth/User — kiểu lấy từ OpenAPI (@ase/contracts), không tự viết DTO.
import type { Schemas } from '@ase/contracts';
import { http, session } from './client';

export type User = Schemas['User'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type LoginRequest = Schemas['LoginRequest'];
export type UpdateMeRequest = Schemas['UpdateMeRequest'];

export const authApi = {
  async register(body: RegisterRequest): Promise<User> {
    return (await http.post<User>('/auth/register', body, { auth: false })).data;
  },
  async login(body: LoginRequest): Promise<void> {
    const res = await http.post<Schemas['TokenEnvelope']['data']>('/auth/login', body, { auth: false });
    await session.signIn(res.data, body.remember_me ?? false);
  },
  logout: () => session.signOut(),
  async me(): Promise<User> {
    return (await http.get<User>('/users/me')).data;
  },
  async updateMe(body: UpdateMeRequest): Promise<User> {
    return (await http.patch<User>('/users/me', body)).data;
  },
};
