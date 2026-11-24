// Container AI Scan (M2-04): chọn + nén ảnh → tải lên (hủy được) → trình sửa nháp → đồng bộ sửa đổi → xác nhận lưu.
// Rule đối soát chạy phía client chỉ để gợi ý; server quyết định (RECEIPT_TOTAL_MISMATCH, INSUFFICIENT_BALANCE…).
import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { newIntentKey } from '@/api/client';
import { ApiError, toUserMessage } from '@/api/errors';
import { financeApi, type Draft } from '@/api/finance';
import { useExpenseCategories, useInvalidateFinance } from '@/api/queries/finance';
import { ImagePickError, pickReceiptImage, type PickedImage } from '@/api/receiptImage';
import { insufficientMessage } from '@/rules/balance';
import { isValidDate } from '@/rules/dates';
import { parseVndInput } from '@/rules/money';
import { isDraftConfirmable, receiptReconcile, receiptSum } from '@/rules/receipt';
import { Screen, Sheet } from '@/ui';
import { OpeningBalanceContainer } from '../../balance/containers/OpeningBalanceContainer';
import { ReceiptDraftEditor, ScanSaved, ScanStart, ScanUploading, type ReceiptDraftEditorProps } from '../components/ScanViews';

interface EditItem {
  key: string;
  id: string | null;
  name: string;
  amount: string;
}
interface EditState {
  merchant: string;
  date: string;
  total: string;
  categoryId: string;
  items: EditItem[];
}

type Stage = { kind: 'start' } | { kind: 'uploading' } | { kind: 'editing' } | { kind: 'saved'; amount: string; merchant: string | null };

let seq = 0;
const fromDraft = (d: Draft): EditState => ({
  merchant: d.merchant_name ?? '',
  date: d.transaction_date ?? '',
  total: d.amount ?? '',
  categoryId: d.category_id ?? '',
  items: d.items.map((i) => ({ key: `k${++seq}`, id: i.id, name: i.item_name ?? '', amount: i.amount ?? '' })),
});

export function ScanContainer() {
  const cats = useExpenseCategories();
  const invalidate = useInvalidateFinance();
  const scanIntent = useMemo(newIntentKey, []);
  const confirmIntent = useMemo(newIntentKey, []);
  const [stage, setStage] = useState<Stage>({ kind: 'start' });
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [askOpening, setAskOpening] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /** Dọn ảnh khỏi bộ nhớ (AC-24): thu hồi object URL, bỏ tham chiếu. */
  const dropImage = (img: PickedImage | null) => {
    img?.release();
    setPicked(null);
  };

  const onPick = async () => {
    setError(null);
    setPicking(true);
    let img: PickedImage | null = null;
    try {
      img = await pickReceiptImage();
    } catch (e) {
      setError(e instanceof ImagePickError ? e.message : 'Không đọc được ảnh, vui lòng chọn ảnh khác');
    } finally {
      setPicking(false);
    }
    if (!img) return;
    setPicked(img);
    setStage({ kind: 'uploading' });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      // Key gắn với 1 lần chọn ảnh: mỗi ảnh mới → key mới; thử lại cùng ảnh → cùng key
      scanIntent.reset();
      const key = scanIntent.forPayload({ size: img.blob.size, at: Date.now() });
      const res = await financeApi.scanReceipt(img.blob, key, ac.signal);
      setDraft(res.draft);
      setEdit(fromDraft(res.draft));
      setNotice(null);
      setStage({ kind: 'editing' });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') setError('Đã hủy tải ảnh.');
      else setError(toUserMessage(e));
      setStage({ kind: 'start' });
    } finally {
      abortRef.current = null;
      dropImage(img); // thành công / lỗi / hủy đều dọn ảnh
    }
  };

  const onCancelUpload = () => {
    abortRef.current?.abort();
  };

  const reset = () => {
    setDraft(null);
    setEdit(null);
    setError(null);
    setNotice(null);
    confirmIntent.reset();
    setStage({ kind: 'start' });
  };

  /** Đẩy các sửa đổi cục bộ lên server (PATCH nháp, thêm/sửa/xóa món). Trả nháp mới nhất. */
  const sync = async (d: Draft, e: EditState): Promise<Draft> => {
    let latest = d;
    const patch: Record<string, string | null> = {};
    if ((d.merchant_name ?? '') !== e.merchant.trim()) patch.merchant_name = e.merchant.trim() || null;
    if ((d.transaction_date ?? '') !== e.date && isValidDate(e.date)) patch.transaction_date = e.date;
    if ((d.amount ?? '') !== e.total && e.total && e.total !== '0') patch.amount = BigInt(e.total).toString();
    if ((d.category_id ?? '') !== e.categoryId && e.categoryId) patch.category_id = e.categoryId;
    if (Object.keys(patch).length) latest = await financeApi.updateDraft(d.id, patch);
    const keep = new Set(e.items.map((i) => i.id).filter(Boolean));
    for (const old of d.items) if (!keep.has(old.id)) latest = await financeApi.deleteDraftItem(old.id);
    for (const it of e.items) {
      const name = it.name.trim();
      const amount = it.amount ? BigInt(it.amount).toString() : '';
      if (!it.id) {
        if (name && amount && amount !== '0') latest = await financeApi.addDraftItem(d.id, { item_name: name, amount });
        continue;
      }
      const old = d.items.find((o) => o.id === it.id);
      const body: { item_name?: string; amount?: string } = {};
      if (name && name !== (old?.item_name ?? '')) body.item_name = name;
      if (amount && amount !== '0' && amount !== (old?.amount ?? '')) body.amount = amount;
      if (Object.keys(body).length) latest = await financeApi.updateDraftItem(it.id, body);
    }
    return latest;
  };

  const onConfirm = async () => {
    if (!draft || !edit || confirming) return;
    setConfirming(true);
    setError(null);
    setNotice(null);
    try {
      const latest = await sync(draft, edit);
      setDraft(latest);
      setEdit(fromDraft(latest));
      const res = await financeApi.confirmDraft(latest.id, confirmIntent.forPayload({ draft: latest.id, amount: latest.amount }));
      confirmIntent.reset();
      invalidate();
      setStage({ kind: 'saved', amount: res.transaction.amount, merchant: res.transaction.receipt?.merchant_name ?? null });
      setDraft(null);
      setEdit(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_BALANCE') {
        const msg = insufficientMessage(e.details);
        setError(msg);
        if (e.details.some((d) => d.field === 'opening_balance')) setAskOpening(true);
      } else if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && e.details.length) {
        setError(e.details.map((d) => d.message).join('; '));
      } else {
        if (e instanceof ApiError && e.code === 'IDEMPOTENCY_KEY_REUSED') confirmIntent.reset();
        setError(toUserMessage(e));
      }
      // Nháp vẫn còn ở trạng thái chờ trên server — tải lại để hiển thị đúng
      try {
        const fresh = await financeApi.getDraft(draft.id);
        setDraft(fresh);
        setEdit(fromDraft(fresh));
      } catch {
        /* giữ nguyên trạng thái cục bộ */
      }
    } finally {
      setConfirming(false);
    }
  };

  const body = () => {
    if (stage.kind === 'uploading') return <ScanUploading previewUrl={picked?.previewUrl ?? null} onCancel={onCancelUpload} />;
    if (stage.kind === 'saved') {
      return <ScanSaved amount={stage.amount} merchant={stage.merchant} onHome={() => router.navigate('/')} onAgain={reset} />;
    }
    if (stage.kind === 'editing' && draft && edit) {
      const items = edit.items.map((i) => ({ item_name: i.name.trim() || null, amount: i.amount || null }));
      const recon = receiptReconcile(edit.total || null, items);
      const vm: ReceiptDraftEditorProps = {
        merchant: edit.merchant,
        date: edit.date,
        total: edit.total,
        categoryId: edit.categoryId,
        categories: cats.data ?? [],
        items: edit.items.map((i) => ({ key: i.key, name: i.name, amount: i.amount, nameMissing: !i.name.trim(), amountMissing: !i.amount || i.amount === '0' })),
        dateError: !edit.date ? 'Chưa có ngày hóa đơn' : isValidDate(edit.date) ? null : 'Ngày không hợp lệ (YYYY-MM-DD)',
        totalMissing: !edit.total || edit.total === '0',
        recon,
        itemsSum: receiptSum(items),
        canConfirm: isDraftConfirmable({
          status: draft.status,
          amount: edit.total && edit.total !== '0' ? edit.total : null,
          category_id: edit.categoryId || null,
          transaction_date: isValidDate(edit.date) ? edit.date : null,
          items,
        }),
        confirming,
        formError: error,
        notice,
        onChange: (field, value) => {
          setEdit((s) => (s ? { ...s, [field]: field === 'total' ? parseVndInput(value) : value } : s));
          setError(null);
        },
        onChangeItem: (key, field, value) => {
          setEdit((s) => (s ? { ...s, items: s.items.map((i) => (i.key === key ? { ...i, [field]: field === 'amount' ? parseVndInput(value) : value } : i)) } : s));
          setError(null);
        },
        onRemoveItem: (key) => setEdit((s) => (s ? { ...s, items: s.items.filter((i) => i.key !== key) } : s)),
        onAddItem: () => setEdit((s) => (s ? { ...s, items: [...s.items, { key: `k${++seq}`, id: null, name: '', amount: '' }] } : s)),
        onConfirm: () => void onConfirm(),
        onDiscard: reset,
      };
      return <ReceiptDraftEditor {...vm} />;
    }
    return <ScanStart error={error} picking={picking} onPick={() => void onPick()} />;
  };

  return (
    <Screen>
      {body()}
      <Sheet visible={askOpening} title="Thiết lập số dư ban đầu" onClose={() => setAskOpening(false)}>
        <OpeningBalanceContainer
          onDone={() => {
            setAskOpening(false);
            setError(null);
            setNotice('Đã thiết lập số dư ban đầu. Bấm “Xác nhận lưu” để lưu hóa đơn.');
          }}
        />
      </Sheet>
    </Screen>
  );
}
