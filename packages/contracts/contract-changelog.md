# Contract changelog

## 1.2.0 — 2026-11-24 (M0-02, Revision 4.0-MVP)
Căn cứ: CR-01 (D-26) §4 E-06 và CR-02 (D-27) §3.2. Không có thay đổi nào ngoài hai CR này.

**CR-02 — số dư ban đầu (thêm 1 endpoint, sửa 1 schema):**
- Mới: `PUT /users/me/opening-balance` (Bearer). Request `{ "amount": "<chuỗi số nguyên ≥ 0>" }` ("0" hợp lệ). 200 → `{ data: { opening_balance, opening_balance_set, locked } }`.
  Lỗi: 422 `VALIDATION_ERROR` (giá trị âm/thập phân/sai định dạng); 409 `CONFLICT` khi đã khóa (đã có khoản chi). Không yêu cầu `Idempotency-Key`.
- `Dashboard`: thêm `opening_balance` (chuỗi) và `opening_balance_set` (boolean), cả hai bắt buộc. Trong MVP `monthly_income` luôn `"0"`, `budget_alerts` luôn `[]` (giữ hình dạng hợp đồng).
- Ánh xạ lỗi chỉ dùng mã API v1.1 §12 (D-15): chưa thiết lập → 422 `INSUFFICIENT_BALANCE` với `details[].field = "opening_balance"`; không đủ số dư → 422 `INSUFFICIENT_BALANCE`.

**CR-01 — phạm vi MVP (không xóa endpoint nào):**
- Tổng 45 operation = 44 (API v1.1) + 1 (CR-02).
- `x-mvp: core` cho 19 operation dùng trong MVP (planning-mvp.md §4.1; 15 cần Bearer), `x-mvp: deferred` cho 26 operation hoãn (§4.2).
- MVP: `POST /transactions` chỉ nhận `type=EXPENSE`; `INCOME` → 422 `VALIDATION_ERROR` (`details[].field = "type"`). Schema request không đổi.

**Kỹ thuật (không đổi ngữ nghĩa):**
- Thêm `summary` cho mọi operation (Redocly 2 yêu cầu `operation-summary`; trước đó `redocly lint` báo 44 lỗi).
- `scripts/check-openapi.mjs` kiểm theo API v1.1 + danh sách CR-02 + danh sách MVP core/deferred và số endpoint cần Bearer, thay cho con số cứng 44.

## 1.1.1 — 2026-11-24 (P0-SH-02)
Nguồn: `05_API_Documentation_v1.1.md` §§2–10 → `openapi.yaml` (44 endpoint, SavingJar = 6).

**Delta duy nhất so với API v1.1 — theo quyết định đã GROUP APPROVED (không phải đề xuất mới):**
- D-12a: `DELETE /transactions/{transactionId}` là **soft delete** (`transactions.deleted_at`), trả **204** cả lần đầu và lần gọi lặp.
- D-12b: giữ `receipt_details`/`receipt_items` của giao dịch đã soft-delete; không cascade.
- ERD delta tương ứng: thêm cột `transactions.deleted_at TIMESTAMPTZ NULL` (xem `apps/api/prisma/schema.prisma`).

**Các điểm diễn giải (không đổi ngữ nghĩa, ghi để FE/BE thống nhất):**
- `DELETE /budgets/{budgetId}` và `DELETE /ai/conversations/{conversationId}` trả 204 (API v1.1 không ghi status).
- `DELETE /ai/draft-items/{itemId}`, `POST /ai/drafts/{draftId}/items`, `PATCH /ai/draft-items/{itemId}` trả **draft đầy đủ** sau revalidate, để FE cập nhật trạng thái đối soát trong một lần gọi.
- Deposit/withdrawal trả 201 kèm jar transaction vừa tạo.
- Không thêm response header nào (không có `Idempotent-Replayed`).
- Mã lỗi chỉ gồm 15 mã ở API v1.1 §12. `DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` **không** có trong contract (D-15).

Mọi thay đổi tiếp theo: ghi vào đây + change request nhóm duyệt.
