// UT-CAT-NORM (D-14), IT-CAT-PROV phần thuần
import { normalizeCategoryName, DEFAULT_CATEGORIES, defaultCategoryRows } from '../../src/modules/category/category-rules';

describe('UT-CAT-NORM', () => {
  it('trim + gộp khoảng trắng + chữ thường, giữ dấu', () => {
    expect(normalizeCategoryName('  Ăn   Uống ')).toBe('ăn uống');
    expect(normalizeCategoryName('An uong')).not.toBe(normalizeCategoryName('Ăn uống'));
  });
  it('NFC: chữ tổ hợp (NFD) và dựng sẵn coi là một', () => {
    const nfd = 'Ăn uống'.normalize('NFD');
    expect(normalizeCategoryName(nfd)).toBe(normalizeCategoryName('Ăn uống'));
  });
  it('danh mục mặc định: có cả 2 loại, không trùng sau chuẩn hóa trong cùng loại', () => {
    const rows = defaultCategoryRows('u1');
    expect(rows.every((r) => r.isDefault && r.userId === 'u1')).toBe(true);
    const keys = rows.map((r) => `${r.type}:${r.nameNormalized}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(DEFAULT_CATEGORIES.some((c) => c.type === 'INCOME')).toBe(true);
    expect(DEFAULT_CATEGORIES.some((c) => c.type === 'EXPENSE')).toBe(true);
    expect(rows.every((r) => r.nameNormalized.length <= 50)).toBe(true);
  });
});
