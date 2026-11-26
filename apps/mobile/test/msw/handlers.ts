// MSW handlers bám theo OpenAPI (kiểu từ @ase/contracts). Dùng cho test Container và chạy app với mock khi BE chưa xong.
// Mở rộng ở Phase 2/3: mỗi endpoint mới thêm handler tại đây; cân nhắc sinh tự động (openapi-msw) khi số lượng lớn.
import { http, HttpResponse } from 'msw';
import type { Schemas } from '@ase/contracts';
import { financeHandlers } from './finance';

export const BASE = 'http://localhost:3000/api/v1';

const users = new Map<string, { user: Schemas['User']; password: string }>();

export const handlers = [
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const b = (await request.json()) as Schemas['RegisterRequest'];
    const email = b.email.trim().toLowerCase();
    if (users.has(email)) {
      return HttpResponse.json(
        { error: { code: 'CONFLICT', message: 'Email đã được sử dụng', details: [{ field: 'email', message: 'Email đã được sử dụng' }], request_id: 'msw' } },
        { status: 409 },
      );
    }
    const user = { id: `u-${users.size + 1}`, full_name: b.full_name, email, phone: b.phone ?? null };
    users.set(email, { user, password: b.password });
    return HttpResponse.json({ data: user }, { status: 201 });
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const b = (await request.json()) as Schemas['LoginRequest'];
    const u = users.get(b.email.trim().toLowerCase());
    if (!u || u.password !== b.password) {
      return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Email hoặc mật khẩu không đúng', request_id: 'msw' } }, { status: 401 });
    }
    return HttpResponse.json({ data: { access_token: `at-${u.user.id}`, refresh_token: `rt-${u.user.id}`, token_type: 'Bearer', expires_in: 900 } });
  }),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({ data: { ok: true } })),

  http.get(`${BASE}/users/me`, ({ request }) => {
    const id = request.headers.get('authorization')?.replace('Bearer at-', '');
    const u = [...users.values()].find((x) => x.user.id === id);
    return u
      ? HttpResponse.json({ data: u.user })
      : HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'x', request_id: 'msw' } }, { status: 401 });
  }),
  ...financeHandlers,
];

export function resetMockDb(seed: { email: string; password: string; full_name?: string }[] = []) {
  users.clear();
  seed.forEach((s, i) =>
    users.set(s.email, { user: { id: `u-${i + 1}`, full_name: s.full_name ?? 'Người dùng', email: s.email, phone: null }, password: s.password }),
  );
}
