# Backend Implementation Plan (NestJS + TypeScript, PostgreSQL, Prisma)
**Nguồn:** (2) PRD · (3) Architecture · (4) ERD · (5) API. **Trạng thái:** Revision 3.2.1 (2026-11-20) – bản đồng bộ nguồn, trình nhóm review; chưa được nhóm duyệt. Không tạo mã, không tạo migration.
> **Nguồn đã đối chiếu trực tiếp trong Revision 3.2.1:** `02_PRD_v1.1.md`, `03_Solution_Architecture_v1.1.md`, `04_Database_Schema_ERD_v1.1.md`, `05_API_Documentation_v1.1.md` (bằng chứng theo document/section ở `review-plan-report.md` §9). PRD v1.1 là Approved business baseline; prototype chỉ là tham chiếu UI. 5 nội dung ngoài PRD v1.1 đã được giữ ngoài phạm vi.

## 1. Kiến trúc & phân lớp
Modular Monolith, một service. Mỗi module: **Controller** (HTTP, DTO, ngữ cảnh xác thực, ánh xạ phản hồi) → **Application service/use case** (điều phối, mở DB transaction) → **Domain rules** (công thức & bất biến, thuần khi có thể) → **Repository** (Prisma) → **Provider adapter** (module AI). Không đặt nghiệp vụ trong controller; không gọi Claude từ controller; không áp Container pattern của frontend vào backend.
```
apps/api/src/
  common/ (config, logging, errors, money, dates, idempotency, guards)
  infra/prisma/
  modules/<module>/{controller, dto, service, domain, repository}
```
Phụ thuộc một chiều: controller → service → (domain, repository); AIChat/AIScan → AIProvider (interface). Module không import repository của module khác.

## 2. Module, endpoint, bảng
| Module | Endpoint (API v1.1) | Use case chính | Bảng |
|---|---:|---|---|
| Auth/User | 6 | register, login, refresh, logout, `GET/PATCH /users/me` | users, auth_sessions |
| Dashboard | 1 | số dư + thu/chi + 5 gần nhất + cảnh báo | (đọc) |
| Category | 2 | liệt kê, tạo tùy chỉnh; không rename/delete | categories |
| Transaction | 5 | tạo/liệt kê/chi tiết/sửa (kể cả sửa hóa đơn nguyên tử)/xóa; luôn kiểm số dư không âm | transactions, receipt_* |
| Budget | 4 | CRUD ngân sách tháng + spent suy diễn | budgets |
| SavingJar | **6** | list, create, detail, deposit, withdrawal, transfer history; không PATCH/DELETE | saving_jars, jar_transactions |
| Statistics | 3 | overview, categories, daily-expenses (7 ngày chi tiêu) | (đọc) |
| AIChat | 13 | hội thoại, tin nhắn, draft, confirm, confirm-all | ai_* |
| AIScan | 4 | upload, draft items, đối soát | ai_draft_*, receipt_* |
| **Tổng endpoint công khai** | **44** | **đếm từ API v1.1 §§2–10; SavingJar = 6** | – |
| AIProvider | nội bộ | adapter, chuẩn hóa, timeout, ánh xạ lỗi | – |
Số endpoint: **44**, kiểm đếm trực tiếp từ các heading endpoint trong `05_API_Documentation_v1.1.md` §§2–10. Không có `PATCH` hoặc `DELETE /saving-jars`. Số endpoint cần Bearer được sinh/đếm từ OpenAPI khi triển khai `IT-AUTHZ`; không hard-code một con số.

## 3. Kế hoạch Prisma & DB
- **Khóa/kiểu:** UUID PK; tiền `BigInt` (domain BigInt; API trả chuỗi); ngày kinh doanh `DATE`; sự kiện `TIMESTAMPTZ`.
- **Ràng buộc chủ sở hữu:** `categories` unique `(user_id, id)` và `(id, type)`; `transactions` FK composite `(user_id, category_id)` và `(category_id, type)`; tương tự budgets, jar_transactions, ai_drafts. Nếu Prisma không biểu diễn được → SQL thô + kiểm tra ở service.
- **CHECK (SQL thô):** `amount > 0`, `target_amount > 0`, `limit_amount > 0`, `month_start` là ngày 1.
- **Xóa dữ liệu:** chiến lược xóa giao dịch (hard delete hay soft delete) và cách xử lý `receipt_details`/`receipt_items` vẫn mở theo PRD OQ-01 (D-12a/D-12b); không khóa cứng hard delete hoặc cascade trước khi nhóm quyết định. Nếu hard delete được chọn, xóa chi tiết hóa đơn nguyên tử cùng parent; nếu soft delete được chọn, giữ chi tiết và loại transaction/children khỏi aggregate đang hoạt động. Dù chọn cách nào cũng không để orphan rows. Draft→transaction `SET NULL`; xóa hội thoại chỉ xóa messages và draft chưa xác nhận, không chạm confirmed transactions.
- **Index:** theo ERD §6. **Migration:** Prisma Migrate + SQL thô được review; **không chạy trước khi nhóm duyệt**; không sửa migration đã áp dụng.

### 3.1 Mapping idempotency theo ERD v1.1 (bảng, cột, kiểu, unique, key scope, request hash)
**Nguồn đã kiểm:** `04_Database_Schema_ERD_v1.1.md` §2 (Conventions), §§3.4, 3.6, 3.7, 3.9–3.11. Tất cả 14 cột đã có trong ERD, với kiểu `VARCHAR` cho key và `CHAR(64)` cho request hash; không còn trường nào cần xác minh hoặc đề xuất thêm. API v1.1 §1.1 quy định key scope theo `(authenticated user, operation, key)`; ERD lưu operation namespace trong giá trị key và áp dụng các unique scope bên dưới.
| # | Thao tác | Bảng | Cột khóa (`VARCHAR`) | Cột request hash (`CHAR(64)`) | Unique scope ERD v1.1 (khi key khác NULL) | Request hash chứa |
|---|---|---|---|---|---|---|
| 1 | `POST /transactions` | `transactions` | `idempotency_key` | `idempotency_request_hash` | `(user_id, idempotency_key)` — ERD §3.4 | SHA-256 payload chuẩn hóa |
| 2 | `POST /saving-jars` (+ nạp đầu) | `saving_jars` | `create_idempotency_key` | `create_request_hash` | `(user_id, create_idempotency_key)` — ERD §3.6 | SHA-256 payload tạo hũ |
| 3 | `POST …/deposits`, `…/withdrawals` | `jar_transactions` | `idempotency_key` | `idempotency_request_hash` | `(user_id, idempotency_key)` — ERD §3.7 | SHA-256 payload (jar, loại, số tiền, ghi chú) |
| 4 | `POST /ai/conversations/{conversationId}/messages` (USER message) | `ai_messages` | `idempotency_key` | `idempotency_request_hash` | `(conversation_id, idempotency_key)` — ERD §3.9 | SHA-256 nội dung tin nhắn + id hội thoại |
| 5 | `POST /ai/receipts/scan` / tạo AI batch | `ai_draft_batches` | `idempotency_key` | `idempotency_request_hash` | `(user_id, source_type, idempotency_key)` — ERD §3.10 | SHA-256 byte ảnh nhận được (AI Scan; không lưu ảnh) |
| 6 | `POST /ai/drafts/{draftId}/confirm` | `ai_drafts` | `confirm_idempotency_key` | `confirm_request_hash` | `(user_id, confirm_idempotency_key)` — ERD §3.11 | SHA-256 (thao tác + id draft) |
| 7 | `POST /ai/draft-batches/{batchId}/confirm-all` | `ai_draft_batches` | `confirm_all_idempotency_key` | `confirm_all_request_hash` | `(user_id, confirm_all_idempotency_key)` — ERD §3.10 | SHA-256 (thao tác + id lô) |
**Scope cấp giao thức:** API v1.1 §1.1 xác định `(authenticated user, operation, key)` và ERD §2 yêu cầu operation namespace nằm trong giá trị key. Tổng cộng **14 cột thuộc 6 bảng**; `create_*` chỉ ở `saving_jars`. Các kiểu và unique scopes ở trên đã được xác minh trực tiếp theo ERD v1.1. D-05 chỉ còn là cổng nhóm review việc áp dụng cấu trúc nguồn vào schema/migration; không phải câu hỏi xác minh lại tên cột, kiểu hay unique scope.

## 4. Bất biến → cách bảo đảm
| Bất biến | DB | Service/domain | Test |
|---|---|---|---|
| Chỉ truy cập dữ liệu của mình | FK composite | lọc `user_id` từ token; 404 khi không thuộc | IT-AUTHZ |
| Số dư khả dụng/hũ theo công thức, không lưu sẵn; **số dư ban đầu 0** | – | `availableBalance`, `jarBalance` thuần | UT-BAL, IT-DASH |
| **Số dư khả dụng không bao giờ âm** (tạo/sửa/xóa giao dịch, nạp hũ, xác nhận draft, confirm-all, AI Scan, sửa hóa đơn) | – | `projectedAvailableBalance ≥ 0` trong cùng DB tx dưới khóa người dùng; vi phạm → rollback toàn bộ | IT-BAL-GUARD, IT-CONC-BAL, UT-BAL |
| Nạp ≤ số dư khả dụng; rút ≤ số dư hũ; hũ không âm | – | cùng cơ chế | IT-JAR, IT-CONC-BAL |
| Confirm-all: validate cả lô + số dư cuối ≥ 0 trước khi ghi | – | khóa draft → validate → ghi 1 DB tx | IT-DRAFT-BATCH |
| Xác nhận 1 draft không lưu draft khác | unique `transaction_id` | compare-and-set theo `draft.id` | IT-DRAFT |
| Giao dịch đã xác nhận sống sót khi xóa hội thoại | FK `SET NULL`, cascade một chiều | xóa trong 1 DB tx | IT-CONV |
| Ảnh hóa đơn tạm thời; chỉ còn fingerprint | không cột ảnh | bộ nhớ + hủy buffer | IT-PRIV, IT-SCAN-ABORT, IT-SCAN-FAIL |
| 1 hóa đơn = 1 EXPENSE + details + items atomic | unique `receipt_details.transaction_id` | 1 DB tx | IT-SCAN-CONFIRM |
| Giao dịch hóa đơn luôn có Σ món = tổng tiền | `receipt_items.amount > 0` | không sửa `amount` độc lập; sửa món + tổng cùng lúc (§5.3) | UT-RECON, IT-TX-RECEIPT-EDIT |
| Retry không ghi trùng; cùng key khác payload bị từ chối bằng 409 | unique key (trường v1.1) | Idempotency service (§5.2) | UT-HASH, IT-IDEM, IT-IDEM-AI |

## 5. Giao dịch DB, đồng thời, idempotency
### 5.1 Quy tắc số dư không âm & khóa tuần tự (D-07 — đã được duyệt theo PRD v1.1; **không mở lại**)
**Quy tắc theo PRD v1.1 FR-03/FR-04 và API v1.1 §§3, 5, 7, 9, 10:** số dư ban đầu = 0; `available balance = recorded income - recorded expenses - jar deposits + jar withdrawals`; số dư khả dụng **không được âm**. Nạp hũ không vượt số dư khả dụng; rút không vượt số dư hũ; mọi thao tác làm số dư dự kiến âm bị từ chối và rollback. Đây là D-07 đã duyệt, **không mở lại**.
**Thuật toán chung** (trong một DB tx): (1) khóa người dùng `SELECT 1 FROM users WHERE id=$1 FOR UPDATE` (thứ tự khóa cố định user → draft/transaction/jar liên quan); (2) `available` = SUM theo công thức; (3) tính `delta` của thao tác; (4) `projected = available + delta`; nếu `projected < 0` → `422 INSUFFICIENT_BALANCE` (API v1.1 §12), **không ghi gì**; (5) ghi; (6) commit. Prisma ánh xạ deadlock `40P01` thành `P2034` → thử lại có giới hạn.
| Thao tác | `delta` | Điều kiện |
|---|---|---|
| Tạo thu nhập | + amount | luôn hợp lệ |
| Tạo chi tiêu / xác nhận draft chi tiêu / xác nhận hóa đơn | − amount | `projected ≥ 0` |
| Sửa số tiền (thu nhập: new−old; chi tiêu: −(new−old)); sửa món+tổng hóa đơn | theo dấu | `projected ≥ 0` |
| Xóa thu nhập | − amount | `projected ≥ 0` (chặn nếu làm số dư âm, vd. đã nạp hũ từ khoản thu đó) |
| Xóa chi tiêu | + amount | luôn hợp lệ |
| Nạp hũ / tạo hũ + nạp đầu | − amount | `projected ≥ 0` |
| Rút hũ | + amount | `amount ≤ jar_balance` (kiểm riêng) |
| Confirm-all | Σ delta cả lô | `projected cuối ≥ 0` **và** mọi draft hợp lệ; sai → không lưu draft nào |
Số dư được suy ra theo **tổng công thức** PRD, không phải số dư lũy kế theo từng ngày. V-06 đã được đóng bằng PRD v1.1 FR-03/FR-10, AC-18 và API v1.1 §9: confirm-all tính **tổng tác động ròng kết hợp** của tất cả draft pending (income và expense cùng được tính), kiểm tra số dư dự kiến cuối của cả lô và ghi tất cả trong một DB transaction. Không đánh giá tuần tự draft theo thứ tự xuất hiện. Nếu có draft invalid hoặc projected combined balance âm, không lưu draft pending nào trong lần confirm-all đó; draft hợp lệ vẫn có thể xác nhận riêng. Sửa ngày/danh mục không đổi số dư nên không bị chặn.
**Chứng minh tính an toàn khi đồng thời:** mọi thao tác ở bảng trên lấy khóa người dùng nên tuần tự hóa; dù thao tác nào giữ khóa trước, thao tác sau đọc số dư đã commit và quyết định. Kết quả hợp lệ duy nhất cho hai thao tác A, B va chạm: (i) cả hai thành công và số dư cuối ≥ 0; hoặc (ii) một thao tác bị `INSUFFICIENT_BALANCE`/`INSUFFICIENT_JAR_BALANCE` và không để lại dấu vết. **Không tồn tại thứ tự nào cho số dư cuối < 0.** Test: `IT-CONC-BAL` (cả hai thứ tự bằng hook + stress), `IT-BAL-GUARD`.

### 5.2 Idempotency và request hash — hợp đồng (409 theo API v1.1)
**Quy tắc cho mọi endpoint có `Idempotency-Key`** (gồm confirm riêng và confirm-all, theo hợp đồng hiện có):
1. **Cùng key + cùng request hash** → trả kết quả đã xử lý (cùng nội dung và HTTP status như lần đầu); không tác dụng phụ, không gọi provider lần hai. **Không thêm response header mới:** header `Idempotent-Replayed` của Revision 2/3.1 **đã bị loại bỏ** vì không có trong hợp đồng và không cần; nếu sau này cần, phải ghi vào OpenAPI/`contract-changelog.md` và được nhóm duyệt.
2. **Cùng key + request hash khác** → **`409 IDEMPOTENCY_KEY_REUSED`**, không tác dụng phụ. Áp dụng cả AI Scan.
3. **Key mới** → xử lý bình thường.
**Request hash:** SHA-256 hex của JSON chuẩn hóa gồm tên thao tác + id tham số đường dẫn + trường nghiệp vụ do client gửi (khóa sắp xếp, tiền chuỗi chuẩn, ngày ISO). **AI Scan:** SHA-256 của **byte ảnh gốc nhận được** (trước resize), tính theo luồng trong lúc xử lý; **chỉ lưu giá trị băm, không lưu ảnh, không ghi ảnh/đường dẫn vào log**; tùy chọn HMAC với khóa server (chờ duyệt).
**Nơi lưu:** đúng bảng/cột ở §3.1. Máy trạng thái draft (compare-and-set, unique `transaction_id`) là lớp bảo vệ thứ hai, không thay cho key.
**Song song cùng key:** unique index là chốt chặn cuối (ghi trùng không thể xảy ra); thao tác AI dùng single-flight trong tiến trình để không gọi provider hai lần; kết quả AI commit trong **một** DB tx sau khi provider trả về; nhiều instance (ngoài v1) chỉ có thể tốn chi phí provider, không ghi trùng.
**Hủy trước commit ≠ mất phản hồi sau commit (AI Scan):**
| Tình huống | Trạng thái server | Retry cùng key |
|---|---|---|
| Client hủy/ngắt kết nối **trước** khi mở DB tx commit | Hủy provider; không batch/draft; key chưa ghi; buffer hủy | Chạy lại như request mới |
| Commit xong, phản hồi mất | Batch + draft + hash đã lưu (`ai_draft_batches.idempotency_*`) | Cùng key + cùng ảnh → trả kết quả cũ; cùng key + **ảnh khác** → 409 |
| Hủy đến giữa lúc commit | Đã vào tx thì không hủy | Như dòng 2 |
**Confirm có số dư:** xác nhận thất bại vì `INSUFFICIENT_BALANCE` → rollback toàn bộ, key **không** được coi là đã dùng cho kết quả thành công; client có thể thử lại cùng key sau khi có thêm thu nhập.
**Vòng đời key phía client:** tạo khi mở form/hộp thoại xác nhận/bấm gửi tin mới/chọn ảnh/bấm xác nhận; giữ nguyên khi thử lại (timeout, mất mạng, 5xx, 401 → refresh); tạo key mới sau thành công hoặc khi đổi nội dung.

### 5.3 Sửa giao dịch hóa đơn nguyên tử (D-06 — hợp đồng hiện có của API v1.1)
**Nguồn kiểm:** API v1.1 §5. `PATCH /transactions/{transactionId}` là hợp đồng hiện có; D-06 đã chốt và không mở lại. Request có `amount` và `receipt{merchant_name, items[]}`; `items` là full replacement và mỗi item gồm `item_name`, `amount`, `sort_order`. Ví dụ dưới đây theo đúng API v1.1:
```json
{
  "amount": "75000",
  "note": "Ăn sáng",
  "receipt": {
    "merchant_name": "Quán A",
    "items": [
      { "item_name": "Phở", "amount": "45000", "sort_order": 1 },
      { "item_name": "Cà phê", "amount": "30000", "sort_order": 2 }
    ]
  }
}
```
Hành vi theo API v1.1 §5: cập nhật transaction và receipt child rows **nguyên tử**; `receipt.items` thay thế toàn bộ danh sách hiện tại; tổng item phải bằng resulting `amount`, sai → 422 `RECEIPT_TOTAL_MISMATCH` và rollback; nếu `amount` của receipt transaction thay đổi thì phải gửi `receipt.items` cùng request; mọi transaction update đều kiểm số dư, nếu projected balance âm → 422 `INSUFFICIENT_BALANCE` và rollback. Sửa category/note/date độc lập vẫn được. Chiến lược hard/soft delete và xử lý receipt child rows tiếp tục mở theo OQ-01/D-12a/D-12b; không mặc định hard delete/cascade. Không tự thêm Idempotency-Key cho PATCH: API v1.1 §5 không nêu PATCH là retryable mutation có key.

### 5.4 Ranh giới DB transaction khác
Xác nhận draft: compare-and-set `UPDATE ai_drafts SET status='CONFIRMED' … WHERE id=$1 AND status='READY'` cùng DB tx với INSERT transaction (và kiểm số dư); 0 dòng → đã CONFIRMED thì trả giao dịch cũ, CANCELLED/EXPIRED → không confirm; không gán mã lỗi riêng chưa có trong API v1.1 (mã/HTTP mapping cụ thể nếu cần thêm được ghi là đề xuất D-15, không phải hợp đồng). Confirm-all: khóa người dùng + draft chờ (`FOR UPDATE`) → validate từng draft và số dư cuối → có lỗi: **không ghi gì**, rollback; hợp lệ: INSERT hết + cập nhật trạng thái trong 1 DB tx.

## 6. AI Provider, Chat, Scan
**AIProvider:** interface `parseTransactions(input)` / `analyzeReceipt(image)`; adapter Claude đọc model id, timeout, retry từ config; FakeProvider/fixtures cho test; ánh xạ lỗi → `AI_PROVIDER_ERROR`/`RATE_LIMITED`; không dựa vào tool_choice bắt buộc (Sonnet 5.5 trả lỗi khi ép tool) mà dùng đầu ra JSON theo schema rồi validate lại.
**Đầu ra model là dữ liệu không tin cậy:** parse theo schema nghiêm ngặt; model trả **tên** danh mục, backend ánh xạ sang `category_id` của chính người dùng; giới hạn số giao dịch/lượt (D-17); nội dung người dùng/ảnh là dữ liệu; AI không có đường gọi confirm.
**Chat:** xác thực + giới hạn → context → provider → validate → **một** DB tx tạo tin nhắn + batch + draft (không tạo transaction); phân biệt mới/sửa draft chờ/hỏi lại; tuần tự theo hội thoại. **Scan:** multipart → kiểm tra content-type, magic bytes, kích thước, giải mã được → đọc vào bộ nhớ và băm SHA-256 theo luồng → tra cứu key (trả cũ hoặc 409) → resize/nén tùy chọn → Vision → chuẩn hóa → 1 batch AI_SCAN + 1 draft + items (1 DB tx) → hủy buffer. Model không chọn danh mục; không tách thuế/phí/giảm giá (giới hạn v1). **Xác nhận draft/hóa đơn luôn qua quy tắc số dư §5.1.**

## 7. Xác thực & bảo mật
Access token ngắn hạn (900 s là ví dụ trong API, cấu hình được); refresh **xoay vòng**, chỉ lưu **hash** (SHA-256 đủ cho token ngẫu nhiên; mật khẩu dùng argon2id/bcrypt — đề xuất); phát hiện dùng lại refresh token cũ → thu hồi phiên; xử lý đua refresh; logout thu hồi bằng refresh token. Remember-me là hành vi phía client (bật: secure storage; tắt: bộ nhớ). **Không có đăng nhập Google/Facebook, quên mật khẩu, xóa tài khoản trong v1** (OQ-02/03, D-22 ngoài phạm vi). Throttle, HTTPS-only, helmet/CORS, DTO validation; khóa AI chỉ ở secret manager/env.

## 8. Quan sát & log
Log có cấu trúc + `request_id`; che: `authorization`, `password`, `refresh_token`, nội dung ảnh/multipart, khóa AI; **không log ảnh và không cần log fingerprint**; log mutation tài chính chỉ gồm loại + id; kiểm toán che ở P4-BE-01.

## 9. Mã lỗi
Theo `05_API_Documentation_v1.1.md` §12, hợp đồng mã lỗi gồm: `400 BAD_REQUEST`; `401 UNAUTHORIZED`; `403 FORBIDDEN`; `404 NOT_FOUND`; `409 CONFLICT`; `409 IDEMPOTENCY_KEY_REUSED`; `422 VALIDATION_ERROR`; `422 BATCH_INVALID`; `422 INSUFFICIENT_BALANCE`; `422 INSUFFICIENT_JAR_BALANCE`; `422 RECEIPT_TOTAL_MISMATCH`; `429 RATE_LIMITED`; `500 INTERNAL_SERVER_ERROR`; `502 AI_PROVIDER_ERROR`; `503 SERVICE_UNAVAILABLE`. `DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` **không có trong API v1.1 §12**; chỉ được để ở danh sách đề xuất D-15 nếu nhóm muốn mở rộng, không được phát sinh thành mã hợp đồng trước khi duyệt.

## 10. Biến cấu hình (chỉ tên, không giá trị)
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TTL`, `AI_PROVIDER` (`claude`/`fake`), `AI_API_KEY`, `AI_MODEL_CHAT`, `AI_MODEL_SCAN`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_MAX_DRAFTS_PER_MESSAGE`, `RECEIPT_MAX_BYTES`, `RECEIPT_ALLOWED_MIME`, `THROTTLE_*`, `TZ_DISPLAY=Asia/Ho_Chi_Minh`.

## 11. Phiên bản công nghệ — chọn ở bootstrap/release, không phải patch version đã được kiến trúc phê duyệt
Architecture v1.1 §§2, 13 chốt **hướng công nghệ** (React Native + Expo + TypeScript; NestJS + TypeScript; PostgreSQL; Prisma; Claude API qua backend adapter) nhưng để **exact package versions, hosting/deployment và một số lựa chọn vận hành** resolve ở bootstrap/release. Patch version từng xuất hiện trong Revision 3.2 không được xem là baseline đã duyệt.

| Thành phần | Hướng theo Architecture v1.1 | Việc cần làm ở P0-TD-01 |
|---|---|---|
| Mobile | React Native + Expo + TypeScript | Chọn Expo SDK/RN stable tương thích; smoke test Android/iOS; pin lockfile |
| Backend | Node.js + NestJS + TypeScript | Chọn Node LTS/NestJS stable tương thích; test build/runtime; pin lockfile |
| Database/ORM | PostgreSQL + Prisma | Chọn PostgreSQL/Prisma stable tương thích; kiểm tra adapter/migration/CI; pin lockfile |
| AI | Claude API qua backend adapter; Fake Provider cho test | Model ID qua config; không hard-code business rules; không gọi live AI trong CI |

Không tự nâng major. Version cụ thể phải có compatibility check, smoke-test evidence, lockfile và được nhóm review tại P0; không suy diễn patch versions là quyết định kiến trúc được duyệt.
