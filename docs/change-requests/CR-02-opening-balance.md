# CR-02 — Số dư ban đầu (Revision 4.0-MVP)

| Thuộc tính | Giá trị |
|---|---|
| Mã | CR-02 · Quyết định D-27 |
| Trạng thái | **Nhóm đã duyệt nội dung qua trao đổi ngày 2026-11-24** (quy tắc OB-1…OB-10, hai thông báo, QA–QF); chờ chữ ký chính thức tại Gate G1 |
| Giữ nguyên | D-07 (số dư không âm), toàn bộ quyết định đã duyệt khác **trừ** các đoạn liệt kê ở §5 |
| Không sửa | `docs/sources/*` v1.1 — CR này **thay thế có hiệu lực** các đoạn ở §5 cho MVP |
| Phụ thuộc | CR-01 (MVP không có thu nhập, hũ) |

## 1. Quy tắc nghiệp vụ
| ID | Quy tắc |
|---|---|
| OB-1 | Tài khoản mới: số dư ban đầu = 0, trạng thái **chưa thiết lập**. |
| OB-2 | Người dùng xác nhận số dư ban đầu là số nguyên VND **≥ 0**. Giá trị 0 hợp lệ. Hệ thống không tự cộng tiền, không ép nhập số > 0. |
| OB-3 | Số âm, số thập phân, không phải số, hoặc vượt 18 chữ số: từ chối; giá trị và trạng thái cũ giữ nguyên. |
| OB-4 | Được sửa số dư ban đầu **trước khoản chi đầu tiên**; sau khoản chi đầu tiên (kể cả khoản chi tạo từ AI Scan đã xác nhận) thì **khóa**. Nháp AI chưa xác nhận không tính là khoản chi. |
| OB-5 | Số dư ban đầu **không** phải thu nhập; không tạo giao dịch nào. |
| OB-6 | Chưa thiết lập mà lưu khoản chi: từ chối, không lưu, thông báo **"Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi."** |
| OB-7 | Đã thiết lập = 0, hoặc đã chi hết: từ chối, không lưu, thông báo **"Số dư không đủ"**. |
| OB-8 | Số dư > 0: lưu được khi khoản chi ≤ số dư (bằng đúng thì số dư về 0); khoản chi > số dư: từ chối, thông báo "Số dư không đủ". |
| OB-9 | AI Scan: quét và sửa nháp **không** bị chặn khi chưa thiết lập; "Xác nhận lưu" áp dụng OB-6…OB-8; bị từ chối thì nháp giữ nguyên trạng thái chờ, không tạo giao dịch/receipt/item nào. |
| OB-10 | Không thao tác nào được làm số dư khả dụng âm (D-07). |

## 2. Công thức số dư MVP (duy nhất)
```
available_balance = opening_balance − Σ amount (transactions
                     WHERE user_id = :me AND type = 'EXPENSE' AND deleted_at IS NULL)
```
- "Khoản chi đã xác nhận" = khoản chi nhập tay đã lưu (FR-04: người dùng xác nhận trước khi lưu) **hoặc** hóa đơn AI Scan đã xác nhận. Nháp không tính.
- **Không** có thu nhập, nạp/rút hũ trong công thức MVP. Khi các chức năng đó được mở lại (sau MVP), công thức phải được sửa qua change request mới.
- `deleted_at IS NULL` giữ để đúng D-12a, dù MVP không có xóa.
- Không vi phạm ERD §4 ("Do not create a second authoritative balance field"): `opening_balance` là **giá trị đầu vào** do người dùng nhập; `available_balance` vẫn luôn được **tính ra**, không lưu.

## 3. Thiết kế kỹ thuật (đã duyệt: C1, C2, C3)
### 3.1 Database (ERD delta)
| Bảng | Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|---|
| `users` | `opening_balance` | `BIGINT NOT NULL DEFAULT 0`, CHECK `opening_balance >= 0` | Số dư ban đầu (VND) |
| `users` | `opening_balance_set_at` | `TIMESTAMPTZ NULL` | `NULL` = chưa thiết lập; có giá trị = đã thiết lập (kể cả khi = 0) |

- Migration: **migration bổ sung** `<timestamp>_cr02_opening_balance`, tạo bằng `prisma migrate dev --create-only`, bổ sung CHECK bằng SQL trong cùng file migration, kiểm `prisma migrate diff` (drift) rỗng. Không sửa migration đã áp dụng. Quy trình đầy đủ: `planning-mvp.md` §7.
- Không thêm bảng. Không thêm cột lưu số dư khả dụng.

### 3.2 API (contract delta, ghi vào `contract-changelog.md` ở M0-02)
**Mới — `PUT /users/me/opening-balance`** (cần Bearer)
```json
// Request
{ "amount": "5000000" }          // chuỗi số nguyên ≥ 0; "0" hợp lệ
// 200
{ "data": { "opening_balance": "5000000", "opening_balance_set": true, "locked": false } }
```
- Khóa người dùng (`SELECT … FROM users WHERE id = $1 FOR UPDATE`) trước khi kiểm "đã có khoản chi chưa", để không đua với khoản chi đầu tiên.
- Không yêu cầu `Idempotency-Key` (PUT ghi đè cùng giá trị là idempotent tự nhiên).

**Sửa — `GET /dashboard`**: thêm `opening_balance` (chuỗi), `opening_balance_set` (boolean). `monthly_income` luôn `"0"`, `budget_alerts` luôn `[]` trong MVP (giữ hình dạng hợp đồng).

### 3.3 Ánh xạ lỗi (chỉ dùng mã có trong API v1.1 §12 — D-15)
| Tình huống | HTTP / code | `details` | Thông báo hiển thị |
|---|---|---|---|
| Số dư ban đầu âm, thập phân, sai định dạng | 422 `VALIDATION_ERROR` | `field: "amount"` | "Số dư ban đầu phải là số nguyên không âm" |
| Sửa số dư ban đầu khi đã khóa | 409 `CONFLICT` | `field: "opening_balance"` | "Không thể sửa số dư ban đầu sau khi đã có khoản chi" |
| Lưu khoản chi / xác nhận hóa đơn khi **chưa thiết lập** | 422 `INSUFFICIENT_BALANCE` | `field: "opening_balance"` | **"Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi."** |
| Số dư = 0 hoặc không đủ | 422 `INSUFFICIENT_BALANCE` | — | **"Số dư không đủ"** |
| `POST /transactions` với `type = INCOME` | 422 `VALIDATION_ERROR` | `field: "type"` | "MVP chỉ hỗ trợ khoản chi" |

Hai thông báo in đậm là câu chữ **đã thống nhất**. Ba câu còn lại (giá trị sai định dạng, đã khóa, INCOME) là câu chữ đề xuất cho giao diện; chỉnh câu chữ không làm thay đổi quy tắc.

FE phân biệt hai trường hợp `INSUFFICIENT_BALANCE` bằng `details[].field === "opening_balance"`; đồng thời đọc `opening_balance_set` từ Dashboard để báo sớm (gợi ý UX, server vẫn quyết định).

## 4. Acceptance criteria bổ sung
| AC | Nội dung |
|---|---|
| AC-27 | Tài khoản mới: số dư ban đầu = 0, `opening_balance_set = false`, số dư khả dụng = 0. |
| AC-28 | Thiết lập `"0"` thành công; `opening_balance_set = true`; số dư khả dụng = 0. |
| AC-29 | Thiết lập số dương thành công; số dư khả dụng = giá trị đó; không có giao dịch nào được tạo. |
| AC-30 | Giá trị âm, thập phân, không phải số hoặc > 18 chữ số bị từ chối; giá trị và trạng thái cũ giữ nguyên. |
| AC-31 | Trước khoản chi đầu tiên: sửa được (dương → 0, 0 → dương). Sau khoản chi đầu tiên (kể cả AI Scan đã xác nhận): bị từ chối 409, giá trị giữ nguyên. |
| AC-32 | Chưa thiết lập: khoản chi bị từ chối với thông báo OB-6; không có bản ghi nào. |
| AC-33 | Đã thiết lập 0, hoặc đã chi hết: khoản chi bị từ chối với "Số dư không đủ"; không có bản ghi nào. |
| AC-34 | Số dư > 0: chi bằng đúng số dư được lưu (số dư về 0); chi vượt số dư bị từ chối, số dư giữ nguyên. |
| AC-35 | AI Scan: xác nhận tuân theo AC-32…AC-34; khi bị từ chối, nháp giữ trạng thái chờ, không tạo giao dịch, receipt hay item. |

## 5. Đoạn tài liệu bị thay thế (cho MVP)
| Tài liệu (không sửa file) | Đoạn bị thay thế | Thay bằng |
|---|---|---|
| PRD v1.1 FR-03 | Dòng công thức `available balance = recorded income - recorded expenses - jar deposits + jar withdrawals` | Công thức §2 |
| PRD v1.1 FR-03 | "There is no opening/initial balance feature. Balance begins at zero and changes only from recorded transactions and internal jar transfers. Available balance excludes money currently held in jars." | OB-1…OB-5 |
| PRD v1.1 FR-04 | Kiểm số dư dự kiến cho chi tiêu | Giữ nguyên, **bổ sung** OB-6…OB-8 |
| PRD v1.1 FR-09 | "No opening balance exists. A user with no recorded income cannot deposit into a jar." | Hết hiệu lực cho MVP (FR-09 hoãn theo CR-01) |
| PRD v1.1 FR-12 | Kiểm số dư khi xác nhận hóa đơn | Giữ nguyên, **bổ sung** OB-9 |
| PRD v1.1 §7 | Mục "Opening balance entry" trong Out of Scope | Đưa vào phạm vi theo CR-02 |
| PRD v1.1 §5 | AC-04 (số dư Dashboard) | AC-04′ trong `planning-mvp.md` + AC-27…AC-35 |
| Architecture v1.1 §9 | "Available balance is derived from recorded income, expenses and jar transfer history; no opening balance." | Công thức §2 |
| Architecture v1.1 §9 | Danh sách thao tác chạy D-07 | **Bổ sung** "thiết lập/sửa số dư ban đầu" vào danh sách dùng chung khóa người dùng |
| ERD v1.1 §3.1 | Bảng `users` | Thêm 2 cột §3.1 |
| ERD v1.1 §4 | `available_balance = SUM(INCOME) - SUM(EXPENSE) - SUM(DEPOSIT) + SUM(WITHDRAW)` | Công thức §2 |
| API v1.1 §3 | "Available balance includes internal jar deposits/withdrawals using the PRD formula." | Công thức §2; Dashboard thêm 2 trường §3.2 |
| API v1.1 §14 | "Target v1 endpoint count: 44" | 45 trong hợp đồng; 19 dùng trong MVP (CR-01 E-06) |
| `review-plan-report.md` §8 | Dòng "Số dư ban đầu = 0" | "Số dư ban đầu mặc định 0, người dùng xác nhận ≥ 0 (CR-02)" |
| `definition-of-done.md` DoD-T mục 5 | Cụm "số dư ban đầu 0" | "quy tắc số dư theo CR-02" |
| `backend-plan.md` §5.1 | Công thức và bảng delta | Công thức §2; delta: khoản chi `−amount`; thiết lập/sửa số dư ban đầu `new − old` (chỉ khi chưa khóa) |
| `test-strategy.md` UT-BAL, IT-BAL-GUARD ca (1), E2E-02 | "số dư ban đầu 0", "người dùng mới (số dư 0)" | Test CR-02 trong `planning-mvp.md` §6 |

## 6. Test bắt buộc của CR-02
| Test | Ca |
|---|---|
| UT-OPEN-VALUE | Hợp lệ: `"0"`, `"1"`, `"5000000"`, `"999999999999999999"`. Từ chối: `"-1"`, `"-5000000"`, `"-0"`, `"1.5"`, `"1e3"`, `"01"`, `" 5"`, `""`, `"abc"`, 19 chữ số, kiểu number |
| UT-BAL | Công thức §2; property-based: mọi chuỗi thao tác (thiết lập 0/dương/âm, chi) → mọi bước được chấp nhận đều có số dư ≥ 0 |
| IT-OPEN-BAL | (1) mới đăng ký; (2) thiết lập 0; (3) thiết lập dương, không tạo giao dịch; (4) thiết lập âm → 422, DB không đổi; (5) sửa trước khoản chi; (6) sửa sau khoản chi thường → 409; (7) sửa sau AI Scan đã xác nhận → 409; (8) user B không ảnh hưởng user A; (9) "thiết lập" và "chi" đồng thời → trạng thái cuối hợp lệ, số dư ≥ 0 |
| IT-BAL-GUARD | (1a) chưa thiết lập + chi → 422 kèm `field=opening_balance`; (1b) thiết lập 0 + chi → 422; (2) chi > số dư; (12) chi = số dư được chấp nhận; (13) xác nhận hóa đơn khi chưa thiết lập → 422, nháp giữ nguyên |
| IT-CONC-BAL | Số dư 100.000; hai khoản chi 60.000 song song → đúng 1 được lưu, số dư cuối 40.000 |
| E2E-02, E2E-09, E2E-13 | Xem `planning-mvp.md` §6 |

## 7. Giới hạn đã biết
Xem CR-01 §5 (mục 1). CR-02 **không** thêm thu nhập hay chức năng điều chỉnh số dư.

Người ký: ____________________  Ngày: __________
