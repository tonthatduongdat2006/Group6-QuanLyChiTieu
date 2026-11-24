// UT-FE-MONEY
import { parseVndInput, validateAmount, compareMoney } from '../../src/rules/money';
import { formatVnd, formatAmountInput } from '../../src/utils/format';

describe('UT-FE-MONEY', () => {
  it('parse ô nhập có dấu chấm/ký hiệu', () => {
    expect(parseVndInput('45.000')).toBe('45000');
    expect(parseVndInput('45 000đ')).toBe('45000');
    expect(parseVndInput('00045')).toBe('45');
    expect(parseVndInput('abc')).toBe('');
    expect(parseVndInput('0')).toBe('0');
  });
  it('validateAmount', () => {
    expect(validateAmount('')).toBe('Vui lòng nhập số tiền');
    expect(validateAmount('0')).toBe('Số tiền phải lớn hơn 0');
    expect(validateAmount('1.5')).toBe('Số tiền không hợp lệ');
    expect(validateAmount('1'.repeat(19))).toBe('Số tiền vượt giới hạn cho phép');
    expect(validateAmount('45000')).toBeNull();
  });
  it('formatVnd không mất chính xác với số > 2^53', () => {
    expect(formatVnd('45000')).toBe('45.000 ₫');
    expect(formatVnd('0')).toBe('0 ₫');
    expect(formatVnd('-1500000')).toBe('-1.500.000 ₫');
    expect(formatVnd('123456789012345678', false)).toBe('123.456.789.012.345.678');
    expect(formatAmountInput('')).toBe('');
  });
  it('property: parse(format(x)) === x', () => {
    for (let i = 0; i < 300; i++) {
      const len = 1 + Math.floor(Math.random() * 18);
      let s = String(1 + Math.floor(Math.random() * 9));
      for (let j = 1; j < len; j++) s += String(Math.floor(Math.random() * 10));
      expect(parseVndInput(formatVnd(s))).toBe(s);
    }
  });
  it('compareMoney dùng BigInt', () => {
    expect(compareMoney('9007199254740993', '9007199254740992')).toBe(1);
    expect(compareMoney('5', '5')).toBe(0);
  });
});
