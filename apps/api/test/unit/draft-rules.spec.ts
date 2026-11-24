// UT-DRAFT + UT-RECON — trạng thái nháp và đối soát tổng hóa đơn (AC-22, AC-23)
import { checkDraft } from '../../src/modules/ai-draft/draft-rules';

const base = { amount: 100000n, categoryId: 'c', transactionDate: new Date('2026-11-10'), items: [{ itemName: 'Phở', amount: 45000n }, { itemName: 'Cà phê', amount: 55000n }] };

describe('UT-DRAFT / UT-RECON', () => {
  it('đủ dữ liệu + tổng khớp → READY', () => expect(checkDraft(base)).toMatchObject({ status: 'READY', issues: [], mismatch: false }));
  it('thiếu danh mục (AI không chọn) → NEEDS_INPUT', () => {
    const c = checkDraft({ ...base, categoryId: null });
    expect(c.status).toBe('NEEDS_INPUT');
    expect(c.issues.map((i) => i.field)).toEqual(['category_id']);
  });
  it('lệch ±1 → mismatch', () => {
    expect(checkDraft({ ...base, amount: 100001n }).mismatch).toBe(true);
    expect(checkDraft({ ...base, amount: 99999n }).mismatch).toBe(true);
  });
  it('ô không đọc được được đánh dấu theo vị trí', () => {
    const c = checkDraft({ ...base, transactionDate: null, items: [{ itemName: 'Bánh mì', amount: 25000n }, { itemName: null, amount: 45000n }, { itemName: 'Trà', amount: null }] });
    expect(c.issues.map((i) => i.field)).toEqual(['transaction_date', 'items[1].item_name', 'items[2].amount']);
    expect(c.mismatch).toBe(false); // chưa đủ giá thì chưa kết luận lệch tổng
  });
  it('không có món / không có tổng → NEEDS_INPUT', () => {
    expect(checkDraft({ ...base, items: [] }).issues.map((i) => i.field)).toContain('items');
    expect(checkDraft({ ...base, amount: null }).issues.map((i) => i.field)).toContain('amount');
  });
  it('số lớn không mất chính xác', () => {
    const big = 999999999999999998n;
    expect(checkDraft({ ...base, amount: big + 1n, items: [{ itemName: 'a', amount: big }, { itemName: 'b', amount: 1n }] }).status).toBe('READY');
  });
});
