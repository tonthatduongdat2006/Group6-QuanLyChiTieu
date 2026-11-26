// UT-REDACT (NFR-PRI, NFR-SEC)
import { redact, REDACTED } from '../../src/common/logging/redact';

describe('UT-REDACT', () => {
  it('che mật khẩu, token, header authorization, ảnh — kể cả lồng nhau', () => {
    const out = redact({
      headers: { Authorization: 'Bearer abc', 'content-type': 'application/json' },
      body: { email: 'a@b.vn', password: 'secret', nested: [{ refresh_token: 't' }] },
      image: Buffer.from('binary'),
    }) as any;
    expect(out.headers.Authorization).toBe(REDACTED);
    expect(out.headers['content-type']).toBe('application/json');
    expect(out.body.password).toBe(REDACTED);
    expect(out.body.email).toBe('a@b.vn');
    expect(out.body.nested[0].refresh_token).toBe(REDACTED);
    expect(out.image).toBe(REDACTED);
  });
  it('không đổi object gốc', () => {
    const src = { password: 'x' };
    redact(src);
    expect(src.password).toBe('x');
  });
});
