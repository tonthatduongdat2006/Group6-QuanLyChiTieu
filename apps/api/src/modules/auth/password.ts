// Băm mật khẩu bằng scrypt (KDF tốn bộ nhớ, có sẵn trong Node, không cần build native trên Vercel).
// Định dạng lưu: scrypt$N$r$p$<salt b64url>$<hash b64url> — có tiền tố để sau này đổi sang argon2id mà không đổi DB.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const scrypt = (pw: string, salt: Buffer, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );

export interface PasswordParams {
  N: number;
  r: number;
  p: number;
}
export const DEFAULT_PASSWORD_PARAMS: PasswordParams = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LEN = 32;

function maxmem(params: PasswordParams): number {
  return 128 * params.N * params.r * 2;
}

export async function hashPassword(plain: string, params: PasswordParams = DEFAULT_PASSWORD_PARAMS): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(plain.normalize('NFC'), salt, KEY_LEN, { ...params, maxmem: maxmem(params) });
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const params = { N: Number(parts[1]), r: Number(parts[2]), p: Number(parts[3]) };
  if (![params.N, params.r, params.p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  const actual = await scrypt(plain.normalize('NFC'), salt, expected.length, { ...params, maxmem: maxmem(params) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash giả để so sánh khi email không tồn tại → thời gian phản hồi giống nhau (chống dò email). */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  return dummyHash;
}
