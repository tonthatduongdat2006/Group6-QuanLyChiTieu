// D-14 — chuẩn hóa tên danh mục: NFC + trim + gộp khoảng trắng + chữ thường (locale vi). KHÔNG bỏ dấu:
// "Ăn uống" và "An uong" là 2 danh mục khác nhau.
export function normalizeCategoryName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');
}

export function cleanCategoryDisplayName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export type CategoryType = 'INCOME' | 'EXPENSE';

/**
 * D-14 (đề xuất, chờ nhóm chốt theo prototype). Đổi danh sách chỉ ảnh hưởng user đăng ký SAU khi đổi.
 * Thứ tự = thứ tự hiển thị mặc định.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ name: string; type: CategoryType }> = [
  { name: 'Ăn uống', type: 'EXPENSE' },
  { name: 'Di chuyển', type: 'EXPENSE' },
  { name: 'Mua sắm', type: 'EXPENSE' },
  { name: 'Hóa đơn & Tiện ích', type: 'EXPENSE' },
  { name: 'Nhà ở', type: 'EXPENSE' },
  { name: 'Giải trí', type: 'EXPENSE' },
  { name: 'Sức khỏe', type: 'EXPENSE' },
  { name: 'Giáo dục', type: 'EXPENSE' },
  { name: 'Gia đình', type: 'EXPENSE' },
  { name: 'Khác', type: 'EXPENSE' },
  { name: 'Lương', type: 'INCOME' },
  { name: 'Thưởng', type: 'INCOME' },
  { name: 'Kinh doanh', type: 'INCOME' },
  { name: 'Được tặng', type: 'INCOME' },
  { name: 'Khác', type: 'INCOME' },
];

export function defaultCategoryRows(userId: string) {
  return DEFAULT_CATEGORIES.map((c) => ({
    userId,
    name: c.name,
    nameNormalized: normalizeCategoryName(c.name),
    type: c.type,
    isDefault: true,
  }));
}
