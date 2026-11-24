// Presentational cho luồng AI Scan (M2-04). Không gọi API, không đọc store, không validate.
import { ActivityIndicator, Image, View } from 'react-native';
import { AmountInput, Banner, Button, Card, Chip, Field, Text } from '@/ui';
import { formatVnd } from '@/utils/format';
import { useTheme } from '@/theme/ThemeProvider';

export function ScanStart({ error, onPick, picking }: { error: string | null; onPick: () => void; picking: boolean }) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">Quét hóa đơn</Text>
      <Text muted>Chọn ảnh hóa đơn có sẵn trên thiết bị. AI đọc tên cửa hàng, ngày, từng món, giá và tổng tiền rồi tạo bản nháp để bạn kiểm tra. Chỉ khi bạn bấm “Xác nhận lưu” khoản chi mới được ghi.</Text>
      <Text muted variant="caption">Ảnh được nén trước khi gửi (tối đa 4 MB) và không được lưu lại sau khi xử lý.</Text>
      {error ? <Banner message={error} /> : null}
      <Button testID="scan-pick" title="Chọn ảnh hóa đơn" loading={picking} onPress={onPick} />
    </View>
  );
}

export function ScanUploading({ previewUrl, onCancel }: { previewUrl: string | null; onCancel: () => void }) {
  return (
    <View style={{ gap: 14, alignItems: 'stretch' }}>
      <Text variant="title">Đang đọc hóa đơn…</Text>
      {previewUrl ? <Image source={{ uri: previewUrl }} style={{ width: '100%', height: 260, borderRadius: 12 }} resizeMode="contain" accessibilityLabel="Ảnh hóa đơn đã chọn" /> : null}
      <ActivityIndicator accessibilityLabel="AI đang phân tích ảnh" />
      <Button testID="scan-cancel" title="Hủy" variant="secondary" onPress={onCancel} />
    </View>
  );
}

export function ScanSaved({ amount, merchant, onHome, onAgain }: { amount: string; merchant: string | null; onHome: () => void; onAgain: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">Đã lưu khoản chi</Text>
      <Banner tone="info" message={`Đã lưu khoản chi ${formatVnd(amount)}${merchant ? ` tại ${merchant}` : ''} kèm danh sách món.`} />
      <Button testID="scan-home" title="Về trang chủ" onPress={onHome} />
      <Button title="Quét hóa đơn khác" variant="secondary" onPress={onAgain} />
    </View>
  );
}

export interface EditItemVM {
  key: string;
  name: string;
  amount: string;
  nameMissing: boolean;
  amountMissing: boolean;
}

export interface ReceiptDraftEditorProps {
  merchant: string;
  date: string;
  total: string;
  categoryId: string;
  categories: { id: string; name: string }[];
  items: EditItemVM[];
  dateError: string | null;
  totalMissing: boolean;
  recon: 'MATCH' | 'MISMATCH' | 'INCOMPLETE';
  itemsSum: string | null;
  canConfirm: boolean;
  confirming: boolean;
  formError: string | null;
  notice: string | null;
  onChange: (field: 'merchant' | 'date' | 'total' | 'categoryId', value: string) => void;
  onChangeItem: (key: string, field: 'name' | 'amount', value: string) => void;
  onRemoveItem: (key: string) => void;
  onAddItem: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
}

export function ReceiptDraftEditor(p: ReceiptDraftEditorProps) {
  const t = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <Text variant="title">Kiểm tra bản nháp</Text>
      <Text muted variant="caption">Ô viền đỏ là ô AI không đọc được hoặc còn thiếu. Khoản chi chưa được lưu cho đến khi bạn bấm “Xác nhận lưu”.</Text>
      {p.notice ? <Banner tone="info" message={p.notice} /> : null}
      {p.formError ? <Banner message={p.formError} /> : null}
      <Field testID="draft-merchant" label="Cửa hàng" value={p.merchant} onChangeText={(v) => p.onChange('merchant', v)} placeholder="Không đọc được" />
      <Field testID="draft-date" label="Ngày hóa đơn (YYYY-MM-DD)" value={p.date} onChangeText={(v) => p.onChange('date', v)} error={p.dateError} autoCapitalize="none" />
      <AmountInput testID="draft-total" label="Tổng tiền hóa đơn (VND)" digits={p.total} onChangeText={(v) => p.onChange('total', v)} error={p.totalMissing ? 'Chưa có tổng tiền' : null} />
      <View style={{ gap: 6 }}>
        <Text variant="caption" style={{ fontWeight: '600' }}>Danh mục (bạn tự chọn)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {p.categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={p.categoryId === c.id} onPress={() => p.onChange('categoryId', c.id)} />
          ))}
        </View>
        {!p.categoryId ? <Text variant="caption" color={t.color.danger}>Vui lòng chọn danh mục</Text> : null}
      </View>
      <Card style={{ gap: 10 }}>
        <Text variant="heading">Các món</Text>
        {p.items.length === 0 ? <Text muted>Chưa có món nào. Thêm ít nhất 1 món.</Text> : null}
        {p.items.map((it, idx) => (
          <View key={it.key} style={{ gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: t.color.border }}>
            <Field testID={`item-name-${idx}`} label={`Món ${idx + 1}`} value={it.name} onChangeText={(v) => p.onChangeItem(it.key, 'name', v)} error={it.nameMissing ? 'Không đọc được tên món' : null} />
            <AmountInput testID={`item-amount-${idx}`} label="Giá (VND)" digits={it.amount} onChangeText={(v) => p.onChangeItem(it.key, 'amount', v)} error={it.amountMissing ? 'Không đọc được giá' : null} />
            <Button title="Xóa món" variant="ghost" onPress={() => p.onRemoveItem(it.key)} />
          </View>
        ))}
        <Button testID="item-add" title="+ Thêm món" variant="secondary" onPress={p.onAddItem} />
      </Card>
      {p.recon === 'MISMATCH' ? (
        <Banner testID="recon-mismatch" tone="warning" message={`Tổng các món (${formatVnd(p.itemsSum ?? '0')}) khác tổng hóa đơn (${formatVnd(p.total || '0')}). Sửa món hoặc tổng tiền để khớp.`} />
      ) : null}
      {p.recon === 'MATCH' ? <Text muted variant="caption">Tổng các món khớp tổng hóa đơn.</Text> : null}
      <Button testID="draft-confirm" title="Xác nhận lưu" loading={p.confirming} disabled={!p.canConfirm} onPress={p.onConfirm} />
      <Button title="Bỏ nháp, quét lại" variant="ghost" onPress={p.onDiscard} />
    </View>
  );
}
