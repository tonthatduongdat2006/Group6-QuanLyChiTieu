// UT-MONEY (AC-06, NFR-INT)
import { parseMoney, parseMoneyOrZero, moneyToString } from '../../src/common/money/money';

describe('UT-MONEY parseMoney', () => {
  it.each(['1', '45000', '999999999999999999'])('chấp nhận %s', (s) => {
    const r = parseMoney(s);
    expect(r.ok).toBe(true);
    if (r.ok) expect(moneyToString(r.value)).toBe(s);
  });

  it.each([
    ['0', 'NOT_POSITIVE'],
    ['-1', 'NOT_POSITIVE'],
    ['1.5', 'INVALID_FORMAT'],
    ['1e3', 'INVALID_FORMAT'],
    ['007', 'INVALID_FORMAT'],
    [' 5', 'INVALID_FORMAT'],
    ['+5', 'INVALID_FORMAT'],
    ['45.000', 'INVALID_FORMAT'],
    ['', 'INVALID_FORMAT'],
    ['1000000000000000000', 'TOO_LARGE'],
  ])('từ chối %s (%s)', (s, err) => {
    expect(parseMoney(s)).toEqual({ ok: false, error: err });
  });

  it('từ chối số kiểu number để tránh mất chính xác', () => {
    expect(parseMoney(45000)).toEqual({ ok: false, error: 'NOT_A_STRING' });
  });

  it('property: mọi chuỗi [1-9][0-9]{0,17} parse rồi in lại không đổi', () => {
    for (let i = 0; i < 500; i++) {
      const len = 1 + Math.floor(Math.random() * 18);
      let s = String(1 + Math.floor(Math.random() * 9));
      for (let j = 1; j < len; j++) s += String(Math.floor(Math.random() * 10));
      const r = parseMoney(s);
      expect(r.ok && r.value.toString() === s).toBe(true);
    }
  });

  it('parseMoneyOrZero cho phép "0" nhưng vẫn chặn âm', () => {
    expect(parseMoneyOrZero('0')).toEqual({ ok: true, value: 0n });
    expect(parseMoneyOrZero('-1').ok).toBe(false);
  });
});
