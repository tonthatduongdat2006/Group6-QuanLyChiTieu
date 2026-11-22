# Planning Deviations – so với gói Revision 3.2.2 GROUP APPROVED

`docs/baseline/MANIFEST_SHA256.txt` là manifest gốc của gói đã duyệt (đường dẫn trong gói: `planning/…`, `sources_read_only/…`; trong repo: `docs/…`, `docs/sources/…`).
Mọi file trong `docs/` và `docs/sources/` phải khớp manifest, **trừ** các mục liệt kê dưới đây.

Kiểm tra (chạy từ thư mục `docs/`):

```bash
sed -e 's#  planning/#  #' -e 's#  sources_read_only/#  sources/#' baseline/MANIFEST_SHA256.txt \
  | grep -vE '  (CHANGELOG|README|SYNC_REPORT)\.md$' | sha256sum -c -
```

Kết quả mong đợi: tất cả `OK`, chỉ các file trong bảng dưới báo `FAILED`.

| # | File | Vị trí | Thay đổi | Lý do | SHA-256 gốc | SHA-256 hiện tại | Trạng thái |
|---|---|---|---|---|---|---|---|
| DV-01 | `docs/test-strategy.md` | §3, suite IT-IDEM, mục (d) | "thiếu key → 400" chỉ áp dụng cho operation có `Idempotency-Key` bắt buộc (`POST /transactions`, `POST /saving-jars`); với nạp/rút hũ key là tùy chọn, request không key vẫn xử lý bình thường | Khớp API v1.1 §7 ("Support") và `packages/contracts/openapi.yaml` (`IdempotencyKeySupported`, `required: false`); chỉ đạo Q4 ngày 2026-11-21 (`docs/decisions.md` §3) | `9724f11a…b071de` | `276e2e3f…ae61315` | Nhóm đã ghi nhận ngày 2026-11-23 (GROUP APPROVED cùng Q4); gate P0-SH-03 chưa ký |

Không có thay đổi nào khác so với gói đã duyệt. Bốn tài liệu nguồn v1.1 trong `docs/sources/` giữ nguyên byte.
