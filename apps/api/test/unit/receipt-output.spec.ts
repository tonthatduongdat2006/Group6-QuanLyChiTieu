// Đầu ra model là dữ liệu không tin cậy (IT-AI-ADV phần thuần): chỉ giữ trường hợp lệ, ô sai → null, không bịa.
import { ProviderError } from '../../src/modules/ai-provider/ai-provider';
import { parseReceiptOutput } from '../../src/modules/ai-provider/receipt-output';
import { loadFixture } from '../fakes/fake-ai-provider';

const out = (name: string) => JSON.stringify((loadFixture(name).provider as { output: unknown }).output);

describe('parseReceiptOutput', () => {
  it('hóa đơn đọc được', () => {
    const r = parseReceiptOutput(out('receipt-readable'));
    expect(r).toEqual({ merchant_name: 'Cửa hàng A', transaction_date: '2026-11-10', total: 100000n, items: [{ item_name: 'Phở', amount: 45000n }, { item_name: 'Cà phê', amount: 55000n }] });
  });
  it('ô không đọc được giữ null', () => {
    const r = parseReceiptOutput(out('receipt-unreadable-fields'));
    expect(r.merchant_name).toBeNull();
    expect(r.transaction_date).toBeNull();
    expect(r.items).toEqual([{ item_name: 'Bánh mì', amount: 25000n }, { item_name: null, amount: 45000n }, { item_name: 'Trà', amount: null }]);
  });
  it('bỏ qua trường lạ (danh mục, lệnh xác nhận) và giá trị sai định dạng', () => {
    const r = parseReceiptOutput(JSON.stringify({ merchant_name: 'X', category: 'Lương', confirm: true, transaction_date: '2026-02-30', total: '-5', items: [{ item_name: 'A', amount: '1.5' }, 'rác', { item_name: '', amount: '0' }] }));
    expect(r).toEqual({ merchant_name: 'X', transaction_date: null, total: null, items: [{ item_name: 'A', amount: null }] });
    expect(Object.keys(r)).toEqual(['merchant_name', 'transaction_date', 'total', 'items']);
  });
  it('JSON hỏng → ProviderError bad_response', () => {
    expect(() => parseReceiptOutput('không phải json')).toThrow(ProviderError);
    expect(() => parseReceiptOutput('[1,2]')).toThrow(ProviderError);
  });
  it('chấp nhận JSON bọc trong ```json', () => expect(parseReceiptOutput('```json\n{"merchant_name":"Y","items":[]}\n```').merchant_name).toBe('Y'));
});
