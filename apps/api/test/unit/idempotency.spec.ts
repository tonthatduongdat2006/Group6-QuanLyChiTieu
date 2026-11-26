// UT-IDEM, UT-HASH (NFR-INT)
import {
  canonicalJson,
  requestHash,
  decideReplay,
  namespacedKey,
  normalizeClientKey,
  SingleFlight,
  IDEMPOTENT_OPERATIONS as OP,
} from '../../src/common/idempotency/idempotency';

describe('UT-HASH canonicalJson/requestHash', () => {
  it('không phụ thuộc thứ tự khóa', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe(
      canonicalJson({ a: { c: [3, { e: 0, f: 1 }], d: 2 }, b: 1 }),
    );
  });

  it('bỏ undefined, giữ null, bigint thành chuỗi', () => {
    expect(canonicalJson({ a: undefined, b: null, c: 5n })).toBe('{"b":null,"c":"5"}');
  });

  it('hash là 64 ký tự hex; đổi 1 trường → hash khác', () => {
    const body = { type: 'EXPENSE', amount: '45000', category_id: 'c1', transaction_date: '2026-11-10' };
    const h1 = requestHash(OP.TRANSACTION_CREATE, {}, body);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(requestHash(OP.TRANSACTION_CREATE, {}, { ...body })).toBe(h1);
    expect(requestHash(OP.TRANSACTION_CREATE, {}, { ...body, amount: '45001' })).not.toBe(h1);
    // cùng body, khác thao tác/khác path param → khác hash
    expect(requestHash(OP.JAR_DEPOSIT, { jarId: 'j1' }, { amount: '1' })).not.toBe(
      requestHash(OP.JAR_WITHDRAW, { jarId: 'j1' }, { amount: '1' }),
    );
    expect(requestHash(OP.JAR_DEPOSIT, { jarId: 'j1' }, { amount: '1' })).not.toBe(
      requestHash(OP.JAR_DEPOSIT, { jarId: 'j2' }, { amount: '1' }),
    );
  });

  it('property: hoán vị khóa ngẫu nhiên không đổi hash', () => {
    const keys = ['amount', 'note', 'type', 'category_id', 'transaction_date'];
    const base: Record<string, string> = { amount: '1', note: 'x', type: 'INCOME', category_id: 'c', transaction_date: '2026-01-01' };
    const h = requestHash(OP.TRANSACTION_CREATE, {}, base);
    for (let i = 0; i < 50; i++) {
      const shuffled = [...keys].sort(() => Math.random() - 0.5);
      const obj: Record<string, string> = {};
      for (const k of shuffled) obj[k] = base[k];
      expect(requestHash(OP.TRANSACTION_CREATE, {}, obj)).toBe(h);
    }
  });
});

describe('UT-IDEM', () => {
  it('quyết định NEW / REPLAY / CONFLICT', () => {
    expect(decideReplay(null, 'h')).toBe('NEW');
    expect(decideReplay({ requestHash: 'h' }, 'h')).toBe('REPLAY');
    expect(decideReplay({ requestHash: 'h' }, 'x')).toBe('CONFLICT');
  });

  it('key có namespace thao tác (ERD §2)', () => {
    expect(namespacedKey(OP.TRANSACTION_CREATE, 'abc12345')).toBe('transactions.create:abc12345');
  });

  it('chuẩn hóa key client', () => {
    expect(normalizeClientKey(' 3f1c2b9e-7a1d-4c3e-9b2a-1f0e5d6c7b8a ')).toBe('3f1c2b9e-7a1d-4c3e-9b2a-1f0e5d6c7b8a');
    expect(normalizeClientKey('short')).toBeNull();
    expect(normalizeClientKey('có dấu tiếng việt')).toBeNull();
    expect(normalizeClientKey(undefined)).toBeNull();
    expect(normalizeClientKey('a'.repeat(129))).toBeNull();
  });

  it('single-flight: 10 lời gọi song song cùng key chỉ chạy 1 lần', async () => {
    const sf = new SingleFlight<number>();
    let calls = 0;
    const work = () => new Promise<number>((r) => setTimeout(() => r(++calls), 10));
    const results = await Promise.all(Array.from({ length: 10 }, () => sf.run('k', work)));
    expect(calls).toBe(1);
    expect(new Set(results).size).toBe(1);
    expect(sf.size).toBe(0);
  });

  it('single-flight: lỗi được giải phóng để lần sau chạy lại', async () => {
    const sf = new SingleFlight<number>();
    await expect(sf.run('k', () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await expect(sf.run('k', () => Promise.resolve(1))).resolves.toBe(1);
  });
});
