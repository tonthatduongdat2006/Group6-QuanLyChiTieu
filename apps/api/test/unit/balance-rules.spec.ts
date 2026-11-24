// UT-OPEN-VALUE + UT-BAL (CR-02 §6)
import { availableBalance, decideSpend, parseOpeningValue, type BalanceState } from '../../src/common/balance/balance-rules';

describe('UT-OPEN-VALUE', () => {
  it.each(['0', '1', '5000000', '999999999999999999'])('chấp nhận %s', (v) => expect(parseOpeningValue(v)).toBe(BigInt(v)));
  it.each(['-1', '-5000000', '-0', '1.5', '1e3', '01', ' 5', '', 'abc', '1'.repeat(19)])('từ chối %p', (v) => expect(parseOpeningValue(v)).toBeNull());
  it('từ chối kiểu number/null/undefined', () => {
    expect(parseOpeningValue(5000)).toBeNull();
    expect(parseOpeningValue(null)).toBeNull();
    expect(parseOpeningValue(undefined)).toBeNull();
  });
});

describe('UT-BAL', () => {
  const s = (opening: bigint, set: boolean, spent: bigint): BalanceState => ({ openingBalance: opening, openingBalanceSet: set, spentTotal: spent });
  it('available = opening − Σ chi', () => expect(availableBalance(s(100000n, true, 60000n))).toBe(40000n));
  it('chưa thiết lập → NOT_SET (kể cả opening 0)', () => expect(decideSpend(s(0n, false, 0n), 1n)).toBe('NOT_SET'));
  it('thiết lập 0 → INSUFFICIENT', () => expect(decideSpend(s(0n, true, 0n), 1n)).toBe('INSUFFICIENT'));
  it('chi = số dư → OK; chi > số dư → INSUFFICIENT', () => {
    expect(decideSpend(s(100000n, true, 0n), 100000n)).toBe('OK');
    expect(decideSpend(s(100000n, true, 0n), 100001n)).toBe('INSUFFICIENT');
  });
  it('property: mọi chuỗi thao tác được chấp nhận đều giữ số dư ≥ 0', () => {
    let seed = 42;
    const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
    for (let run = 0; run < 300; run++) {
      let st = s(0n, false, 0n);
      for (let step = 0; step < 30; step++) {
        if (rnd(4) === 0 && st.spentTotal === 0n) st = { ...st, openingBalance: BigInt(rnd(200000)), openingBalanceSet: true };
        else {
          const amt = BigInt(1 + rnd(80000));
          if (decideSpend(st, amt) === 'OK') st = { ...st, spentTotal: st.spentTotal + amt };
        }
        expect(availableBalance(st) >= 0n).toBe(true);
      }
    }
  });
});
