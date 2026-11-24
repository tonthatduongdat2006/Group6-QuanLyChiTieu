// UT-DATE
import {
  parseDateOnly,
  formatDateOnly,
  parseMonth,
  todayInBusinessTz,
  currentMonthInBusinessTz,
  isFirstDayOfMonth,
} from '../../src/common/dates/dates';

const at = (iso: string) => ({ now: () => new Date(iso) });

describe('UT-DATE', () => {
  it('parse ngày hợp lệ, kể cả 29/2 năm nhuận', () => {
    expect(formatDateOnly(parseDateOnly('2026-11-10')!)).toBe('2026-11-10');
    expect(parseDateOnly('2028-02-29')).not.toBeNull();
  });

  it.each(['2026-02-29', '2026-13-01', '2026-11-31', '26-11-10', '2026/11/10', '2026-11-10T00:00:00Z', ''])(
    'từ chối %s',
    (s) => expect(parseDateOnly(s)).toBeNull(),
  );

  it('D-09: không chặn ngày tương lai', () => {
    expect(parseDateOnly('2099-12-31')).not.toBeNull();
  });

  it('parseMonth trả khoảng [đầu tháng, đầu tháng sau)', () => {
    const m = parseMonth('2026-12')!;
    expect(formatDateOnly(m.monthStart)).toBe('2026-12-01');
    expect(formatDateOnly(m.nextMonthStart)).toBe('2027-01-01');
    expect(parseMonth('2026-13')).toBeNull();
    expect(parseMonth('2026-1')).toBeNull();
  });

  it('"hôm nay" theo Asia/Ho_Chi_Minh, không theo UTC', () => {
    // 2026-11-23 17:30 UTC = 2026-11-24 00:30 giờ VN
    expect(todayInBusinessTz(at('2026-11-23T17:30:00Z'))).toBe('2026-11-24');
    expect(todayInBusinessTz(at('2026-11-23T16:59:59Z'))).toBe('2026-11-23');
    // giao thừa
    expect(currentMonthInBusinessTz(at('2026-12-31T17:00:00Z'))).toBe('2027-01');
  });

  it('isFirstDayOfMonth', () => {
    expect(isFirstDayOfMonth(parseDateOnly('2026-11-01')!)).toBe(true);
    expect(isFirstDayOfMonth(parseDateOnly('2026-11-02')!)).toBe(false);
  });
});
