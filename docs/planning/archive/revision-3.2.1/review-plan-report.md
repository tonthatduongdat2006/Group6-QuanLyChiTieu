# Review Plan Report – Revision 3.2.1
**Dự án:** Quản Lý Chi Tiêu – AI Smart Expense · **Ngày:** 2026-11-20 · **Phạm vi:** Đồng bộ Planning Revision 3.2 với 4 tài liệu nguồn v1.1 (không code, không migration, không sửa source docs).
> **Trạng thái cuối: READY FOR GROUP REVIEW.** Bốn tài liệu nguồn v1.1 đã được đọc trực tiếp: `02_PRD_v1.1.md`, `03_Solution_Architecture_v1.1.md`, `04_Database_Schema_ERD_v1.1.md`, `05_API_Documentation_v1.1.md`. V-01…V-08 đã được đối chiếu và có document/section evidence tại §9. Các quyết định còn mở (đặc biệt D-05 áp dụng schema/migration và D-12a/D-12b hard/soft delete + receipt child rows) vẫn được ghi rõ là việc nhóm cần review/chốt, không tự chọn thay nhóm. **READY FOR GROUP REVIEW không đồng nghĩa GROUP APPROVED.** Không viết code, không tạo migration.

## 0. Báo cáo tổng kết Revision 3.2.1
### 0.1 Thay đổi chính so với Revision 3.2
| # | Vấn đề ở Revision 3.2 | Đồng bộ ở Revision 3.2.1 | File |
|---|---|---|---|
| C-01 | Một số file báo nguồn v1.1 không có và V-01…V-08 còn mở | Đọc trực tiếp 4 nguồn; ghi bằng chứng document/section tại §9; đóng V-01…V-08 | review-plan-report §1/§9; repository-audit; các plan headers |
| C-02 | Idempotency unique scope/type còn cần xác minh hoặc theo v1.0 | Xác nhận 14 cột/6 bảng, `VARCHAR` keys, `CHAR(64)` hashes, unique scopes chính xác theo ERD v1.1 | backend-plan §3.1; task-breakdown; test-strategy; DoD |
| C-03 | Có chỗ khóa hard-delete + cascade receipt rows | Giữ D-12a/D-12b mở; Backend/Task/DoD/Test/Risk đều theo chính sách sau khi nhóm chọn; quyết định trước migration | backend-plan; task-breakdown; definition-of-done; test-strategy; risk-register |
| C-04 | V-06 chưa đóng hoặc diễn đạt không đồng nhất | Confirm-all tính combined net effect của cả lô draft và kiểm tra projected final balance; không tính tuần tự theo thứ tự draft; atomic all-or-none | backend-plan §4–5; task-breakdown P3-BE-06; test-strategy; §9 |
| C-05 | Endpoint matrix cũ chưa đồng bộ API v1.1 | API v1.1 có 44 endpoint; SavingJar có 6; không PATCH/DELETE saving jars; Bearer count sinh từ OpenAPI, không hard-code | backend-plan §2; phase-breakdown; task-breakdown; test-strategy |
| C-06 | PATCH receipt thiếu `sort_order`, error/balance rules chưa chính xác | `receipt.items` gồm `item_name`, `amount`, `sort_order`; full replacement/atomic; mismatch 422 `RECEIPT_TOTAL_MISMATCH`; negative projected balance 422 `INSUFFICIENT_BALANCE` | backend-plan §5.3; frontend-plan §9; §9 |
| C-07 | Mã lỗi chưa có trong API được ghi như contract | `DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` chỉ còn là đề xuất D-15 | backend-plan §5.4/§9; frontend-plan; test-strategy |
| C-08 | Patch versions cũ được mô tả như baseline đã duyệt | Phân biệt approved technology direction với exact package versions phải resolve ở bootstrap/release theo Architecture v1.1 | backend-plan §11; frontend-plan §10; D-03 |

### 0.2 Các việc vẫn cần nhóm review/chốt
1. **D-05:** nhóm review việc áp dụng mapping idempotency đã xác định theo ERD vào schema/migration; không còn cần xác minh lại tên cột, kiểu hay unique scope.
2. **D-12a/D-12b:** nhóm lựa chọn hard delete hay soft delete transaction và cách xử lý receipt child rows; phải chốt trước migration. Revision 3.2.1 không chọn thay nhóm.
3. Các lựa chọn kỹ thuật loại ② (repo, version pins, CI, token, cấu hình AI…) vẫn chờ nhóm review ở gate thích hợp. OQ chưa tới giai đoạn triển khai tiếp tục được hoãn có chủ đích.
4. Mã lỗi chưa có trong API v1.1 chỉ là đề xuất D-15; cần nhóm duyệt trước khi mở rộng OpenAPI.

### 0.3 Kết quả kiểm tra
80 task và 5 Phase được giữ nguyên. Kiểm tra độc lập ID/dependency/test/traceability được ghi ở §4; không tạo code hoặc migration.

### 0.4 V-06 — công thức số dư và confirm-all
V-06 **đã đóng theo nguồn**: PRD v1.1 FR-03/FR-10 và AC-18; API v1.1 §§3, 9, 13; ERD v1.1 §§4–5. Số dư khả dụng là công thức tổng. Confirm-all validate từng draft nhưng đánh giá **combined net effect** của toàn bộ draft pending trên số dư dự kiến cuối. Không phụ thuộc thứ tự draft. Nếu có draft invalid hoặc tổng tác động khiến số dư cuối âm, lần confirm-all đó không lưu draft nào; draft hợp lệ vẫn có thể xác nhận riêng. D-07 giữ nguyên, không mở lại.

## 1. Phiên bản nguồn thực sự đã đọc
| Tài liệu | File | Nội dung/section đối chiếu | Trạng thái |
|---|---|---|---|
| PRD | `02_PRD_v1.1.md` | §§1–9; FR-01…FR-12, AC-01…AC-26, §7 Out of Scope, OQ-01/OQ-10/OQ-11 | Đọc trực tiếp; Approved business baseline |
| Solution Architecture | `03_Solution_Architecture_v1.1.md` | §§1–13; §2 stack, §§5–6 ECC/backend layering, §§12–13 testing/open assumptions | Đọc trực tiếp |
| Database Schema / ERD | `04_Database_Schema_ERD_v1.1.md` | §§2–7; 14 bảng, 14 idempotency columns across 6 tables, constraints, deletion/retention | Đọc trực tiếp |
| API Documentation | `05_API_Documentation_v1.1.md` | §§1–16; endpoint headings §§2–10, PATCH receipt §5, Saving Jars §7, confirm §9, errors §12, inventory §14 | Đọc trực tiếp |
| Planning archive | ZIP Revision 3.2 | đủ 10 file planning, 80 task / 5 Phase | Đọc trực tiếp |

Không có repository mã nguồn trong 10-file planning ZIP; `repository-audit.md` do đó là package/input audit và xác nhận greenfield planning, không phải audit code repository. Các bản v1.0 được nhắc trong lịch sử Revision 3.2 chỉ là historical inputs, không thay thế baseline v1.1.

## 2. Phạm vi và các REQ-X của Revision 3
Revision 3 coi 5 nội dung (REQ-X1…X5) là yêu cầu PRD. **Không tự nhận chúng là bắt buộc của PRD v1.1** (yêu cầu 3.1 §1 và §4). Nay:
| Nội dung (REQ-X) | Quyết định | Loại | Trạng thái trong kế hoạch | Nếu nhóm muốn thêm (change request) |
|---|---|---|---|---|
| X1 Xóa danh mục tùy chỉnh | D-21 | ③ | **Ngoài phạm vi v1** | Cần: `DELETE` danh mục, chuyển giao dịch sang "Khác", chính sách ngân sách, draft về NEEDS_INPUT; không đổi ERD ngoài rule FK; tác động P2-BE-01/04, P2-FE-03, API/ERD/test |
| X2 Số giao dịch + tổng tiền theo danh mục | D-24 | ③ | **Đề xuất bổ sung tùy chọn** (không là yêu cầu bắt buộc) | Mở rộng `GET /categories?month=` hoặc `GET /statistics/categories` thêm `transaction_count` — thay đổi hợp đồng cần duyệt, không đổi ERD |
| X3 Google/Facebook OAuth | D-22 | ③ | **Ngoài phạm vi v1** | Cần module identity, bảng/cột ERD, cấu hình OAuth ngoài, 2 task |
| X4 Biểu tượng + hạn hoàn thành của hũ | D-23 | ③ | **Không bắt buộc lưu** (biểu tượng chỉ ánh xạ client nếu muốn) | +2 cột nullable ở hũ, thay đổi API tạo hũ |
| X5 Xu hướng thu nhập + chọn kỳ tuần/tháng | D-10 | ① | **Đóng theo PRD v1.1:** chỉ biểu đồ chi tiêu 7 ngày; không mở rộng | – |
Thiết kế chi tiết của Revision 3 cho các mục này **không còn trong 10 file** (đã gỡ để tránh nhầm là phạm vi); nếu nhóm mở change request, Claude sẽ dựng lại thiết kế tương ứng.

## 3. Mapping idempotency theo ERD v1.1 — đã đối chiếu trực tiếp
| # | Thao tác | Bảng | Key (`VARCHAR`) | Request hash (`CHAR(64)`) | Unique scope khi key khác NULL | Nguồn ERD |
|---|---|---|---|---|---|---|
| 1 | `POST /transactions` | `transactions` | `idempotency_key` | `idempotency_request_hash` | `(user_id, idempotency_key)` | §3.4 |
| 2 | `POST /saving-jars` | `saving_jars` | `create_idempotency_key` | `create_request_hash` | `(user_id, create_idempotency_key)` | §3.6 |
| 3 | `POST /saving-jars/{jarId}/deposits`, `/withdrawals` | `jar_transactions` | `idempotency_key` | `idempotency_request_hash` | `(user_id, idempotency_key)` | §3.7 |
| 4 | `POST /ai/conversations/{conversationId}/messages` (USER message) | `ai_messages` | `idempotency_key` | `idempotency_request_hash` | `(conversation_id, idempotency_key)` | §3.9 |
| 5 | `POST /ai/receipts/scan` / create AI batch | `ai_draft_batches` | `idempotency_key` | `idempotency_request_hash` | `(user_id, source_type, idempotency_key)` | §3.10 |
| 6 | `POST /ai/drafts/{draftId}/confirm` | `ai_drafts` | `confirm_idempotency_key` | `confirm_request_hash` | `(user_id, confirm_idempotency_key)` | §3.11 |
| 7 | `POST /ai/draft-batches/{batchId}/confirm-all` | `ai_draft_batches` | `confirm_all_idempotency_key` | `confirm_all_request_hash` | `(user_id, confirm_all_idempotency_key)` | §3.10 |

**Tổng cộng: 14 cột, 6 bảng.** Key columns dùng `VARCHAR`; request hashes dùng `CHAR(64)`; unique scopes được đối chiếu theo ERD v1.1 §§3.4, 3.6, 3.7, 3.9–3.11 và chỉ áp dụng khi key khác NULL. `ai_messages` áp dụng cho USER messages. `ai_draft_batches` có hai cặp độc lập: `idempotency_*` cho tạo batch và `confirm_all_*` cho confirm-all. API v1.1 §1.1 quy định protocol scope `(authenticated user, operation, key)` và operation namespace nằm trong giá trị key. Không thêm response header `Idempotent-Replayed`. D-05 còn là cổng nhóm review việc áp dụng schema/migration; không còn là việc xác minh lại tên cột, kiểu hay unique scope.

## 4. Kiểm tra tĩnh trên 10 file Planning Revision 3.2.1
| Hạng mục | Phương pháp kiểm tra độc lập trong bản bàn giao | Kết quả |
|---|---|---|
| Task IDs | Parse task table theo pattern `P{phase}-{branch}-{number}` | ✔ 80 IDs, 80 unique |
| Phase/task count | Đếm task theo phase | ✔ P0 9 · P1 16 · P2 22 · P3 23 · P4 10 = 80 |
| Dependency references | Parse cột phụ thuộc trong task table; đối chiếu từng ID với tập 80 task | ✔ 112 dependency edges explicit; 0 missing dependency IDs |
| Dependency cycle | Topological sort trên dependency edges explicit | ✔ 80/80 nodes processed; không thấy cycle trong explicit dependencies. Phase-gate dependencies là policy riêng ở phase/dependency docs, không được tính trong con số 112 này |
| Test IDs | So sánh test references ở task table với các test identifiers có trong test-strategy | ✔ Tất cả test refs có định nghĩa sau khi thay generic `UT-FE-*` bằng suite cụ thể; kiểm tra bằng token set, không chứng minh test code đã chạy |
| FR/AC/NFR traceability | Đếm ID chuẩn trong PRD và mapping report; kiểm tra coverage theo ma trận §6 | ✔ 12 FR, 26 AC, 5 nhóm NFR xuất hiện trong ma trận; đây là kiểm tra tài liệu, không phải test runtime |
| Idempotency | Đối chiếu từng bảng/cột/type/unique scope với ERD v1.1 | ✔ 14 cột/6 bảng; `create_*` chỉ ở `saving_jars`; không cột nào “cần xác minh” |
| API inventory | Đếm endpoint headings ở API v1.1 §§2–10 và đối chiếu module matrix | ✔ 44 endpoint; SavingJar 6; không PATCH/DELETE saving jars |
| Contract errors | Đối chiếu danh mục backend/frontend/test với API v1.1 §12 | ✔ mã ngoài contract chỉ còn là D-15 proposal |
| D-12 deletion | Quét backend/task/DoD/test/risk | ✔ hard/soft delete và receipt-child strategy vẫn mở; không giả định cascade |

**Giới hạn kiểm chứng:** đây là kiểm tra cấu trúc tài liệu và mapping. Chưa tạo OpenAPI generated, chưa chạy compiler/linter/test code, chưa chạy database migration, chưa test live AI provider; không tuyên bố các kiểm tra đó đã hoàn tất.

## 5. Quy tắc số dư không âm — D-07 (giữ nguyên)
Số dư ban đầu 0; available balance = recorded income − recorded expenses − jar deposits + jar withdrawals. D-07 không mở lại. Mọi thao tác làm projected available balance âm phải từ chối và rollback; confirm-all kiểm tra combined net effect của cả lô và final projected balance, không xử lý tuần tự. Chi tiết backend-plan §5.1; test plan gồm `UT-BAL`, `IT-BAL-GUARD`, `IT-CONC-BAL` và `IT-DRAFT-BATCH`.

## 6. Ma trận truy vết (sinh tự động từ dữ liệu ánh xạ đã kiểm tra)
Cột API trong ma trận đã được đối chiếu với API v1.1 §§2–10; các path parameter trong ma trận dùng đúng tên từ hợp đồng nguồn (ví dụ `transactionId`, `budgetId`, `jarId`, `conversationId`, `draftId`, `batchId`, `itemId`).
### 6.1 FR → API → UI → Task → Test
| FR | API | UI | Task | Test |
|---|---|---|---|---|
| FR-01 | `POST /auth/register`, `GET /users/me`, `PATCH /users/me` | Đăng ký/Đăng nhập, ProfileScreen | P1-BE-04, P1-BE-05, P1-FE-06 | IT-AUTH, UT-VALID, E2E-01 |
| FR-02 | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Đăng ký/Đăng nhập | P1-BE-04, P1-FE-04, P1-FE-06 | IT-AUTH, UT-FE-SESSION, E2E-01 |
| FR-03 | `GET /dashboard` | DashboardScreen | P2-BE-02, P2-BE-07, P2-FE-09 | UT-BAL, IT-DASH, E2E-02 |
| FR-04 | `POST /transactions` | AddTransactionScreen | P2-BE-03, P2-FE-04 | IT-TX, IT-BAL-GUARD, UT-MONEY, E2E-02 |
| FR-05 | `GET /categories`, `POST /categories` | CategoriesScreen | P1-BE-06, P2-BE-01, P2-FE-03 | IT-CAT, UT-CAT-NORM, E2E-11 |
| FR-06 | `GET /budgets`, `POST /budgets`, `PATCH /budgets/{budgetId}`, `DELETE /budgets/{budgetId}` | BudgetScreen | P2-BE-02, P2-BE-04, P2-FE-06 | UT-BUDGET, IT-BUD, E2E-03 |
| FR-07 | `GET /transactions`, `GET /transactions/{transactionId}`, `PATCH /transactions/{transactionId}`, `DELETE /transactions/{transactionId}` | HistoryScreen, TransactionDetail, ReceiptItemsEditor | P2-BE-03, P2-FE-05, P3-BE-08, P3-FE-08 | IT-TX-CONSISTENCY, IT-BAL-GUARD, IT-TX-RECEIPT-EDIT, IT-TX-DEL-RECEIPT, E2E-04, E2E-12 |
| FR-08 | `GET /statistics/overview`, `GET /statistics/categories`, `GET /statistics/daily-expenses` | StatsScreen | P2-BE-06, P2-FE-08 | UT-STAT, IT-STAT |
| FR-09 | `GET /saving-jars`, `POST /saving-jars`, `GET /saving-jars/{jarId}`, `POST /saving-jars/{jarId}/deposits`, `POST /saving-jars/{jarId}/withdrawals`, `GET /saving-jars/{jarId}/transactions` | JarsScreen, JarDetailSheet, JarCreateSheet | P2-BE-05, P2-FE-07 | IT-JAR, IT-BAL-GUARD, IT-CONC-BAL, E2E-05 |
| FR-10 | `POST /ai/conversations`, `POST /ai/conversations/{conversationId}/messages`, `GET /ai/conversations`, `GET /ai/conversations/{conversationId}`, `GET /ai/conversations/{conversationId}/messages`, `GET /ai/conversations/{conversationId}/draft-batches`, `PATCH /ai/conversations/{conversationId}`, `DELETE /ai/conversations/{conversationId}`, `GET /ai/drafts/{draftId}`, `PATCH /ai/drafts/{draftId}`, `POST /ai/drafts/{draftId}/cancel`, `POST /ai/drafts/{draftId}/confirm`, `POST /ai/draft-batches/{batchId}/confirm-all` | AiHub, Chat, DraftCard, ConversationList | P3-BE-01, P3-BE-02, P3-BE-03, P3-BE-04, P3-BE-05, P3-BE-06, P3-FE-03, P3-FE-04, P3-FE-05 | IT-CHAT, IT-DRAFT, IT-DRAFT-BATCH, IT-BAL-GUARD, IT-CONV, IT-IDEM-AI, E2E-06, E2E-07, E2E-08 |
| FR-11 | `POST /ai/receipts/scan`, `POST /ai/drafts/{draftId}/items`, `PATCH /ai/draft-items/{itemId}`, `DELETE /ai/draft-items/{itemId}` | Scan, ReceiptDraftEditor | P3-BE-07, P3-BE-08, P3-BE-09, P3-FE-06, P3-FE-07 | IT-SCAN, IT-SCAN-IDEM, IT-SCAN-ABORT, IT-SCAN-REPLAY, IT-SCAN-FAIL, IT-PRIV, UT-RECON, E2E-09, E2E-10 |
| FR-12 | `POST /ai/drafts/{draftId}/confirm`, `POST /ai/receipts/scan`, `PATCH /ai/drafts/{draftId}` | ReceiptDraftEditor, DraftCard | P3-BE-05, P3-BE-08, P3-FE-07, P3-FE-08 | IT-SCAN-CONFIRM, IT-BAL-GUARD, E2E-09 |
### 6.2 AC → API → UI → Task → Test
| AC | API | UI | Task | Test |
|---|---|---|---|---|
| AC-01 | `POST /auth/register` | Đăng ký/Đăng nhập | P1-BE-04, P1-FE-05, P1-FE-06 | IT-AUTH, UT-VALID, E2E-01 |
| AC-02 | `POST /auth/register` | Đăng ký/Đăng nhập | P1-BE-04, P1-FE-05, P1-FE-06 | IT-AUTH, UT-VALID, E2E-01 |
| AC-03 | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` | Đăng ký/Đăng nhập | P1-BE-04, P1-FE-04, P1-FE-06 | IT-AUTH, UT-FE-SESSION, E2E-01 |
| AC-04 | `GET /dashboard` | DashboardScreen | P2-BE-02, P2-BE-07, P2-FE-09 | UT-BAL, IT-DASH, E2E-02 |
| AC-05 | `POST /transactions` | AddTransactionScreen | P2-BE-03, P2-FE-04 | IT-TX, IT-BAL-GUARD, E2E-02 |
| AC-06 | `POST /transactions` | AddTransactionScreen | P2-BE-03, P2-FE-04 | IT-TX, IT-BAL-GUARD, UT-MONEY, E2E-02 |
| AC-07 | `GET /categories`, `POST /categories` | CategoriesScreen | P1-BE-06, P2-BE-01, P2-FE-03 | IT-CAT, E2E-11 |
| AC-08 | `GET /budgets`, `POST /budgets`, `PATCH /budgets/{budgetId}`, `DELETE /budgets/{budgetId}` | BudgetScreen | P2-BE-04, P2-FE-06 | IT-BUD, E2E-03 |
| AC-09 | `GET /budgets`, `GET /dashboard` | BudgetScreen, DashboardScreen | P2-BE-02, P2-BE-04, P2-BE-07, P2-FE-06, P2-FE-09 | UT-BUDGET, IT-BUD, E2E-03 |
| AC-10 | `GET /transactions`, `GET /transactions/{transactionId}`, `PATCH /transactions/{transactionId}`, `DELETE /transactions/{transactionId}` | HistoryScreen, TransactionDetail | P2-BE-03, P2-FE-05 | IT-TX, E2E-04 |
| AC-11 | `PATCH /transactions/{transactionId}`, `DELETE /transactions/{transactionId}` | HistoryScreen, ReceiptItemsEditor | P2-BE-03, P2-FE-05, P3-BE-08, P3-FE-08 | IT-TX-CONSISTENCY, IT-BAL-GUARD, IT-TX-RECEIPT-EDIT, IT-TX-DEL-RECEIPT, E2E-04, E2E-12 |
| AC-12 | `GET /statistics/overview`, `GET /statistics/categories`, `GET /statistics/daily-expenses` | StatsScreen | P2-BE-06, P2-FE-08 | UT-STAT, IT-STAT, E2E-04 |
| AC-13 | `POST /saving-jars`, `POST /saving-jars/{jarId}/deposits`, `POST /saving-jars/{jarId}/withdrawals` | JarsScreen, JarDetailSheet | P2-BE-05, P2-FE-07 | IT-JAR, IT-BAL-GUARD, E2E-05 |
| AC-14 | `POST /saving-jars`, `POST /saving-jars/{jarId}/deposits`, `POST /saving-jars/{jarId}/withdrawals` | JarCreateSheet, JarDetailSheet | P2-BE-05, P2-FE-07 | IT-JAR, IT-BAL-GUARD, IT-CONC-BAL, E2E-05 |
| AC-15 | `POST /ai/conversations/{conversationId}/messages` | Chat, DraftCard | P3-BE-04, P3-FE-03, P3-FE-04 | IT-CHAT, IT-IDEM-AI, E2E-06 |
| AC-16 | `POST /ai/conversations/{conversationId}/messages` | Chat | P3-BE-04 | IT-CHAT, E2E-07 |
| AC-17 | `POST /ai/drafts/{draftId}/confirm` | DraftCard | P3-BE-05, P3-FE-04 | IT-DRAFT, IT-BAL-GUARD, IT-CONC, IT-CONC-BAL, E2E-06 |
| AC-18 | `POST /ai/draft-batches/{batchId}/confirm-all` | DraftCard | P3-BE-06, P3-FE-04 | IT-DRAFT-BATCH, IT-BAL-GUARD, IT-CONC, IT-CONC-BAL, E2E-07 |
| AC-19 | `PATCH /ai/conversations/{conversationId}`, `GET /ai/conversations`, `GET /ai/conversations/{conversationId}/draft-batches` | ConversationList | P3-BE-03, P3-FE-05 | IT-CONV, E2E-08 |
| AC-20 | `DELETE /ai/conversations/{conversationId}` | ConversationList | P3-BE-03, P3-FE-05 | IT-CONV, E2E-08 |
| AC-21 | `POST /ai/receipts/scan` | Scan | P3-BE-07 | IT-SCAN, IT-SCAN-IDEM, E2E-09 |
| AC-22 | `POST /ai/drafts/{draftId}/items`, `PATCH /ai/draft-items/{itemId}`, `DELETE /ai/draft-items/{itemId}` | ReceiptDraftEditor | P3-BE-08, P3-FE-07 | IT-SCAN, E2E-09 |
| AC-23 | `POST /ai/drafts/{draftId}/confirm`, `PATCH /transactions/{transactionId}` | ReceiptDraftEditor, ReceiptItemsEditor | P3-BE-02, P3-BE-08, P3-FE-01, P3-FE-07 | UT-RECON, IT-SCAN-CONFIRM, IT-TX-RECEIPT-EDIT, E2E-09 |
| AC-24 | `POST /ai/receipts/scan` | Scan | P3-BE-07, P3-BE-09, P3-FE-06 | IT-PRIV, IT-SCAN-ABORT, IT-SCAN-REPLAY, IT-SCAN-FAIL, E2E-10 |
| AC-25 | `POST /ai/receipts/scan`, `PATCH /ai/drafts/{draftId}` | ReceiptDraftEditor | P3-BE-07, P3-FE-07 | IT-SCAN, E2E-09 |
| AC-26 | `POST /ai/drafts/{draftId}/confirm` | ReceiptDraftEditor | P3-BE-08, P3-FE-08 | IT-SCAN-CONFIRM, IT-BAL-GUARD, E2E-09 |
### 6.3 NFR → Task → Test
| NFR | Task | Test |
|---|---|---|
| NFR-SEC (bảo mật) | P1-BE-04, P1-FE-04, P3-TD-02, P4-BE-01, P4-BE-02, P4-FE-02 | IT-AUTH, IT-AUTHZ, IT-SEC, IT-AI-ADV, UT-FE-SESSION, E2E-01 |
| NFR-PERF (hiệu năng, độ bền) | P3-BE-01, P2-BE-08, P4-BE-04, P4-FE-01 | IT-PROVIDER-MAP, IT-SCAN-FAIL, IT-FE-CONTAINER |
| NFR-INT (toàn vẹn dữ liệu) | P1-BE-01, P1-BE-03, P2-BE-02, P2-BE-03, P2-BE-05, P3-BE-05, P3-BE-06, P3-BE-08, P4-BE-03 | IT-SCHEMA, UT-BAL, UT-IDEM, UT-HASH, IT-IDEM, IT-IDEM-AI, IT-BAL-GUARD, IT-CONC-BAL, IT-CONC, IT-TX-CONSISTENCY, IT-SCAN-CONFIRM, E2E-12 |
| NFR-PRI (riêng tư) | P3-BE-07, P3-BE-09, P3-FE-06, P4-FE-02 | IT-PRIV, IT-SCAN-ABORT, IT-SCAN-REPLAY, IT-SCAN-FAIL, E2E-10 |
| NFR-USA (khả dụng, bảo trì) | P1-FE-01, P1-FE-02, P3-BE-01, P4-FE-01, P4-TD-01 | IT-CONTRACT, IT-PROVIDER-MAP, IT-FE-CONTAINER, IT-ENVELOPE, PLAT-01…06 |
**Kết quả theo ma trận tài liệu:** 12/12 FR, 26/26 AC, 5/5 NFR được ánh xạ tới task/test và API/UI khi áp dụng; kiểm tra IDs được mô tả tại §4. Đây là traceability review, không phải test runtime.

## 7. Sổ quyết định D-xx
**Phân loại:** ① quyết định nghiệp vụ đã được nhóm phê duyệt và được giữ nguyên · ② đề xuất kỹ thuật chờ nhóm duyệt · ③ Open Question có thể hoãn/ngoài phạm vi · ④ xung đột tài liệu cần giải quyết.
| ID | Quyết định | Loại | Mặc định đề xuất / ghi chú | Tác động nếu đổi | Cần trước |
|---|---|---|---|---|---|
| D-01 | Prototype baseline | ② | Dùng prototype hiện tại làm tham chiếu giao diện; PRD thắng; thiếu thì thiết kế mới | Chỉ giao diện/copy | **không chặn** |
| D-02 | Cấu trúc repo | ② | Monorepo `apps/mobile`, `apps/api`, `packages/contracts` | Tách repo: phát hành gói contracts | P0-TD-01 |
| D-03 | Phiên bản | ② | Chọn stable versions tương thích ở bootstrap/release; smoke test và pin lockfile. Architecture v1.1 không phê duyệt patch versions cụ thể | Đổi → chạy lại smoke | P0-TD-01 |
| D-04a | Nhà cung cấp CI | ② | CI của nơi lưu repo | Viết lại pipeline | P0-TD-05 |
| D-04b | Hosting/vùng triển khai | ③ | Hoãn | Chỉ chặn phát hành | P4-TD-02 |
| D-05 | Áp dụng mapping idempotency 14 cột theo ERD v1.1 | ② | Bảng/cột/kiểu/unique scope đã xác minh ở §3; không thêm cột/header. Nhóm review việc áp dụng vào schema/migration | Mọi thay đổi so với ERD phải qua change review | P1-BE-01/P1-BE-03 trước migration |
| D-06 | Sửa giao dịch hóa đơn | ① | Giữ nguyên, không mở lại: API v1.1 §5 có `PATCH /transactions/{transactionId}`; amount + receipt/items full replacement, item có `item_name`, `amount`, `sort_order`, atomic, tổng item = amount | – | – |
| D-07 | Số dư khả dụng không âm | ① | Theo PRD v1.1 FR-03/FR-04 và API v1.1; **không mở lại** | – | – |
| D-08 | Ngân sách theo tháng | ② | Bản ghi theo tháng; không tự lặp | Tự lặp đổi nghiệp vụ/ERD | P2-BE-04 |
| D-09 | Ngày giao dịch / future-date cutoff | ③ | OQ-10 chưa quyết định future-date cutoff; chỉ áp dụng định dạng/ngày hợp lệ theo API, không tự cấm ngày tương lai | Khi có quyết định mới → update validation/tests | P2-BE-03 (chỉ nếu nhóm chốt policy) |
| D-10 | Thống kê theo ngày | ① | Biểu đồ chi tiêu 7 ngày theo PRD v1.1; không mở rộng; không scope override | – | – |
| D-11 | Sửa/xóa hũ (OQ-05) | ③ | Hoãn; ngoài phạm vi | Duyệt → bật P2-BE-09 | P2-BE-09 |
| D-12a | Xóa giao dịch | ③ | OQ-01 mở: hard delete hay soft delete; nhóm phải chọn trước migration. Revision 3.2.1 không chọn thay nhóm | Chọn chiến lược quyết định schema/API/test | P1-BE-01/P2-BE-03 trước migration |
| D-12b | Receipt child rows khi xóa transaction | ③ | OQ-01 mở: xử lý child rows phụ thuộc D-12a; không mặc định cascade. ERD §7 nêu cách xử lý theo lựa chọn hard/soft | Chọn chính sách trước migration | P1-BE-01 |
| D-12c | Xóa tài khoản (OQ-03) | ③ | Hoãn | – | không chặn |
| D-13a | Ghi nhớ đăng nhập | ② | Bật: secure storage; tắt: bộ nhớ | – | P1-FE-04 |
| D-13b | Access/Refresh token | ② | Access ngắn hạn, refresh xoay vòng + hash + thu hồi | – | P1-BE-04 |
| D-13c | Quên mật khẩu (OQ-02) | ③ | Hoãn | – | không chặn |
| D-13d | Xóa tài khoản | ③ | = D-12c | – | không chặn |
| D-14 | Danh mục mặc định + chuẩn hóa | ② | Bộ danh mục theo prototype; NFC + chữ thường + trim, không bỏ dấu | Chỉ seed | P1-BE-06 |
| D-15 | Quy ước/mã lỗi mở rộng | ② | Không sửa contract v1.1 nếu chưa được nhóm duyệt. `DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` chỉ là đề xuất, không phải error code đã duyệt | Bổ sung cần update OpenAPI + tests sau khi duyệt | P0-SH-02 |
| D-16 | Thư viện FE + E2E | ② | `frontend-plan.md` §10 | Không ảnh hưởng ECC | P1-FE-01 |
| D-17 | Cấu hình AI (số liệu OQ-04) | ② | Chat `claude-haiku-5-5`, Scan `claude-sonnet-5-5`; timeout 30/60 s; retry 1; ≤ 10 draft/tin | Chỉ đổi config | P3-BE-01 |
| D-18 | Ngữ nghĩa AI Chat | ② | Gợi ý danh mục từ danh sách; không khớp → NEEDS_INPUT; shape sửa/hỏi lại; xóa hội thoại xóa mọi draft/batch | Đổi (c) | P3-BE-03 |
| D-19 | Luật hóa đơn (số liệu OQ-08) | ② | JPEG/PNG/WebP; nén phía client; ≤ 10 MB; ≥ 1 món; chỉ EXPENSE | Chỉ config | P3-BE-07 |
| D-20 | Lưu giữ & backup (OQ-06/07/09) | ③ | Hoãn; job retention tắt mặc định | – | P3-BE-10 / P4-TD-02 |
| D-21 | Xóa danh mục tùy chỉnh | ③ | **Ngoài phạm vi v1** (theo yêu cầu 3.1); chỉ nếu nhóm mở change request | Xem §2 | không task |
| D-22 | Đăng nhập Google/Facebook | ③ | **Ngoài phạm vi v1** | Xem §2 | không task |
| D-23 | Biểu tượng/hạn hoàn thành của hũ | ③ | **Không bắt buộc lưu** | Xem §2 | không task |
| D-24 | Số giao dịch theo danh mục | ③ | **Đề xuất bổ sung tùy chọn**, không là yêu cầu PRD | Xem §2 | không task |
| D-25 | Baseline nguồn = bộ v1.1 | ① | PRD v1.1 là Approved business baseline; chỉ thay khi nhóm cung cấp PRD ký/xuất mới hơn. Bốn nguồn v1.1 đã được đối chiếu trực tiếp trong Revision 3.2.1 | – | – |
Phân bố sau đồng bộ: ① 4 (D-06, D-07, D-10, D-25) · ② 15 · ③ 12 · ④ 0 (tổng 31; D-13d là tham chiếu tới D-12c). D-06, D-07 và D-10 **không bị mở lại**.

## 8. Quyết định nghiệp vụ đã duyệt — được giữ nguyên
| Quyết định đã duyệt | Nơi giữ trong kế hoạch |
|---|---|
| Số dư ban đầu = 0 | UT-BAL; backend-plan §5.1 |
| Công thức số dư có tính nạp/rút hũ | UT-BAL, IT-DASH |
| Nạp/rút hũ là luân chuyển nội bộ, không phải thu/chi | UT-STAT, UT-BUDGET, IT-JAR |
| AI Chat nhiều lượt, có ngữ cảnh trong phiên | P3-BE-04 |
| Hội thoại đã lưu khôi phục được cả draft chưa xác nhận | P3-BE-03, P3-FE-05, E2E-08 |
| AI không tự lưu giao dịch | P3-BE-04/05; IT-AI-ADV |
| Xác nhận từng draft hoặc tất cả | P3-BE-05/06; E2E-06/07 |
| Confirm-all nguyên tử | P3-BE-06; IT-DRAFT-BATCH, IT-CONC |
| AI Scan tạo một giao dịch tổng + danh sách món | P3-BE-07/08; IT-SCAN-CONFIRM |
| Không lưu ảnh hóa đơn gốc sau xử lý | P3-BE-07/09; IT-PRIV (chỉ còn fingerprint) |
| Sửa giao dịch hóa đơn bảo toàn Σ món = tổng | D-06; backend-plan §5.3; IT-TX-RECEIPT-EDIT |
Khác biệt tài liệu được ghi nhận và đề xuất cách đồng bộ; không sửa nghiệp vụ đã duyệt.

## 9. Checklist V-01…V-08 — đã đối chiếu trực tiếp với 4 tài liệu v1.1
| ID | Nguồn và section bằng chứng | Kết quả đối chiếu | Trạng thái |
|---|---|---|---|
| V-01 | PRD v1.1 §§1–6, 9; FR-01…FR-12, AC-01…AC-26, NFR | PRD có 12 FR, 26 AC, 5 nhóm NFR; v1.1 là Approved business baseline. FR-03/04 và data-integrity rules giữ available balance không âm; số dư ban đầu = 0 trong baseline nghiệp vụ | **Đóng** |
| V-02 | PRD v1.1 §7; FR-05/08/09; API v1.1 §§4, 7, 8, 14 | Category chỉ liệt kê/tạo; không có delete/rename API; không có social OAuth; Saving Jars có 6 endpoint, không PATCH/DELETE; không thêm icon/target date như thuộc tính bắt buộc; daily statistics là daily expenses, không thêm income 7-day chart/period selector | **Đóng** |
| V-03 | ERD v1.1 §2; §§3.4, 3.6, 3.7, 3.9, 3.10, 3.11; §7 | 14 bảng; 14 idempotency columns trên 6 bảng. Key `VARCHAR`; hashes `CHAR(64)`. Unique scopes: transactions `(user_id,idempotency_key)`; saving_jars `(user_id,create_idempotency_key)`; jar_transactions `(user_id,idempotency_key)`; ai_messages `(conversation_id,idempotency_key)` cho USER; ai_draft_batches `(user_id,source_type,idempotency_key)` và `(user_id,confirm_all_idempotency_key)`; ai_drafts `(user_id,confirm_idempotency_key)`. Deletion/retention vẫn chịu OQ-01/ERD §7 | **Đóng** |
| V-04 | API v1.1 §§1.1–1.6, §§2–10, §12, §14 | Đếm trực tiếp 44 endpoint; Saving Jars có 6; không PATCH/DELETE. `Idempotency-Key` + 409 `IDEMPOTENCY_KEY_REUSED` theo §1.1; confirm/confirm-all có key theo §9. PATCH receipt §5: amount + `receipt{merchant_name,items[]}`, item `{item_name,amount,sort_order}`, full replacement/atomic; mismatch → 422 `RECEIPT_TOTAL_MISMATCH`; projected balance âm → 422 `INSUFFICIENT_BALANCE`. Không có response header `Idempotent-Replayed` trong contract | **Đóng** |
| V-05 | Solution Architecture v1.1 §§1–6, 12–13 | Chốt hướng React Native + Expo + TypeScript; NestJS + TypeScript; PostgreSQL + Prisma; Claude API qua backend adapter; Rule/Store/Container + presentational; backend layering. Exact patch versions, hosting/deployment settings được resolve ở bootstrap/release | **Đóng** |
| V-06 | PRD v1.1 FR-03, FR-10, AC-18; ERD v1.1 §§4–5; API v1.1 §§3, 5, 9, 13 | Available balance là công thức tổng, không lũy kế theo thứ tự ngày. Confirm-all validate các draft nhưng đánh giá combined net effect/final projected balance của toàn bộ pending batch; không tuần tự theo thứ tự draft. Nếu có draft invalid hoặc combined result âm, batch không ghi draft nào; atomic. D-07 giữ nguyên | **Đóng** |
| V-07 | PRD v1.1 FR-04…FR-06, FR-08, §8 OQ-10/OQ-11; ERD v1.1 §§3.3, 3.5; API v1.1 §§4–6, §14 | Category không có rename/delete trong v1. Budget theo bản ghi tháng; no-auto-carry-forward là assumption v1, không nâng thành quyết định vĩnh viễn. Transaction date phải hợp lệ; future-date cutoff chưa quyết định theo OQ-10 nên không tự áp cutoff | **Đóng** |
| V-08 | API v1.1 §12; rules liên quan §§5, 9, 10, 13 | Error contract: 400 `BAD_REQUEST`; 401 `UNAUTHORIZED`; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `CONFLICT`, `IDEMPOTENCY_KEY_REUSED`; 422 `VALIDATION_ERROR`, `BATCH_INVALID`, `INSUFFICIENT_BALANCE`, `INSUFFICIENT_JAR_BALANCE`, `RECEIPT_TOTAL_MISMATCH`; 429 `RATE_LIMITED`; 500 `INTERNAL_SERVER_ERROR`; 502 `AI_PROVIDER_ERROR`; 503 `SERVICE_UNAVAILABLE`. `DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` không thuộc §12; chỉ đề xuất D-15 | **Đóng** |

**Open questions vẫn còn:** V-01…V-08 đóng nghĩa là đã đọc và đối chiếu nguồn, không có nghĩa mọi OQ đã được giải quyết. OQ-01 hard/soft delete và receipt child-row policy vẫn cần nhóm chốt trước migration; OQ-10 future-date cutoff chưa quyết định; OQ-11 monthly budget/no automatic carry-forward là assumption v1. Bearer endpoint count sẽ được đếm tự động từ generated OpenAPI, không hard-code.

## 10. Rà soát phiên bản công nghệ
Architecture v1.1 §2 xác định approved technology direction; §§11–13 để exact package versions, hosting và deployment settings được resolve ở bootstrap/release. Vì vậy patch versions trong Revision 3.2 không được coi là kiến trúc đã phê duyệt. `backend-plan.md` §11 và `frontend-plan.md` §10 hiện yêu cầu compatibility checks, smoke tests và lockfiles tại bootstrap; không tự nâng major.

## 11. Kết luận Review Plan Revision 3.2.1
| Hạng mục | Kết quả |
|---|---|
| Đọc trực tiếp đủ 4 tài liệu nguồn v1.1 | ✔ |
| Hoàn tất V-01…V-08 có document/section evidence | ✔ (§9) |
| Idempotency 14 cột/6 bảng; type + unique scopes đã đối chiếu ERD | ✔ (§3; backend-plan §3.1; IT-SCHEMA) |
| Không khóa hard delete/cascade; D-12a/D-12b vẫn mở trước migration | ✔ |
| V-06: confirm-all combined net effect, không tuần tự theo thứ tự draft | ✔ |
| API v1.1 endpoint matrix: 44 tổng; SavingJar 6; không PATCH/DELETE jars | ✔ |
| D-06 PATCH receipt: item_name, amount, sort_order; atomic/error/balance rules đúng | ✔ |
| Error codes ngoài API v1.1 chỉ là D-15 proposals | ✔ |
| D-07, D-10, D-06 và nghiệp vụ nhóm đã duyệt giữ nguyên | ✔ |
| 5 Phase / 80 task | ✔ (P0 9 · P1 16 · P2 22 · P3 23 · P4 10) |
| ID/dependency/test/traceability checks | Xem §4; giới hạn kiểm chứng được ghi rõ |

**Trạng thái: READY FOR GROUP REVIEW.** Đây là bộ kế hoạch đã đồng bộ nguồn và sẵn sàng trình nhóm review; **không phải GROUP APPROVED**. Nhóm cần review các quyết định còn mở, nhất là D-05 và D-12a/D-12b, trước khi ký gate hoặc cho phép migration. Không viết code, không tạo migration.
