// UT-FE-IDEM — vòng đời key theo ý định
import { IntentKey } from '../../src/api/idempotency';

describe('IntentKey', () => {
  let n = 0;
  const uuid = () => `key-${++n}`;
  it('cùng payload (khác thứ tự khóa, lồng nhau) → cùng key khi thử lại', () => {
    const k = new IntentKey(uuid);
    const a = k.forPayload({ amount: '1', meta: { b: 1, a: 2 } });
    expect(k.forPayload({ meta: { a: 2, b: 1 }, amount: '1' })).toBe(a);
  });
  it('đổi nội dung (kể cả trường lồng) → key mới', () => {
    const k = new IntentKey(uuid);
    const a = k.forPayload({ amount: '1', meta: { a: 1 } });
    expect(k.forPayload({ amount: '1', meta: { a: 2 } })).not.toBe(a);
  });
  it('sau thành công reset → key mới dù cùng payload', () => {
    const k = new IntentKey(uuid);
    const a = k.forPayload({ amount: '1' });
    k.reset();
    expect(k.forPayload({ amount: '1' })).not.toBe(a);
  });
});
