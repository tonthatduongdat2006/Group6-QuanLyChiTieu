# CR-01 — Phạm vi MVP (Revision 4.0-MVP)

| Thuộc tính | Giá trị |
|---|---|
| Mã | CR-01 · Quyết định D-26 |
| Trạng thái | **Nhóm đã duyệt nội dung qua trao đổi ngày 2026-11-24**; chờ chữ ký chính thức tại Gate G1 |
| Áp dụng cho | Toàn bộ Planning thực thi: `docs/planning/planning-mvp.md` |
| Không sửa | `docs/sources/*` (PRD, Architecture, ERD, API v1.1) — vẫn là bản gốc; CR này ghi **ngoại lệ** áp dụng cho MVP |
| Đi kèm | CR-02 (số dư ban đầu) |

## 1. Mục tiêu
Cắt giảm khối lượng để hoàn thành một MVP **chạy thật** (không phải demo giả), truy cập qua **URL công khai** cho giảng viên.

## 2. Trong phạm vi MVP
1. Đăng ký, đăng nhập, đăng xuất (FR-01, FR-02 — có ngoại lệ E-04).
2. Thiết lập số dư ban đầu (CR-02).
3. Thêm và xem khoản chi (FR-04 thu gọn, FR-07 chỉ xem).
4. Dashboard tối thiểu (FR-03 thu gọn).
5. AI Scan: tải ảnh hóa đơn, đọc thông tin, sửa nháp, xác nhận lưu (FR-11, FR-12).
6. Danh mục chi mặc định, chỉ xem (FR-05 thu gọn).
7. Triển khai Expo Web + API qua URL công khai.

## 3. Hoãn (Deferred) — giữ hợp đồng, bảng và task để làm sau
| Nội dung | FR/AC nguồn | Ghi chú |
|---|---|---|
| Khoản thu (income) | FR-04 phần thu, FR-08 | `POST /transactions` với `type=INCOME` bị từ chối 422 `VALIDATION_ERROR` trong MVP |
| Sửa / xóa khoản chi | FR-07 (sửa, xóa), AC-10 phần sửa/xóa, AC-11 | Bảng vẫn có `transactions.deleted_at` (D-12a) |
| Sửa hóa đơn đã xác nhận | D-06, AC-23 phần giao dịch đã xác nhận | Hợp đồng PATCH giữ nguyên, không triển khai |
| Tạo danh mục tùy chỉnh | FR-05, AC-07 phần tạo | |
| Ngân sách | FR-06, AC-08, AC-09 | |
| Thống kê | FR-08, AC-12 | Dashboard chỉ hiển thị chi tiêu tháng |
| Hũ tiết kiệm | FR-09, AC-13, AC-14 | |
| AI Chat (backend + UI) | FR-10, AC-15…AC-20 | Bảng `ai_conversations`, `ai_messages` giữ nguyên |
| Hủy nháp, xác nhận tất cả | FR-10 | Mỗi lần quét = 1 nháp |
| Job retention, backup/restore | D-20, OQ-06/07/09 | |
| Hiệu năng, dark mode, cỡ chữ lớn | NFR-PERF, P4-FE-01 | |
| App native Android/iOS phát hành | Architecture §1–§2 | Code native giữ, không phát hành trong MVP |

**Loại khỏi MVP (không hoãn):** tài khoản demo / seed dữ liệu demo (P4-SH-01 phần seed). Giảng viên tự đăng ký và dùng thật. Chỉ danh mục mặc định được tạo tự động khi đăng ký.

## 4. Ngoại lệ so với tài liệu nguồn v1.1 và Planning 3.2.2
| Mã | Tài liệu nguồn nói | MVP áp dụng | Lý do / quyết định |
|---|---|---|---|
| E-01 | Architecture §1 "Native mobile experience targeting Android and iOS"; PRD §6 "Android/iOS target" | Triển khai **Expo Web** qua URL công khai; code React Native giữ nguyên | Nhóm đã duyệt Expo Web |
| E-02 | `backend-plan.md` §11: "không deploy Expo mobile app lên Vercel" | Bản **web tĩnh** của Expo được deploy (nền tảng xác định ở spike M0-05) | Hệ quả của E-01 |
| E-03 | D-16 (đề xuất): E2E bằng Maestro trên app native | E2E bằng **Playwright** trên Expo Web; flow Maestro (`e2e/*.yaml`) giữ lại, đánh dấu hoãn | QF/C7 đã duyệt |
| E-04 | PRD FR-02: "remember-me/session persistence experience using secure token storage" | Trên Expo Web **ẩn** tùy chọn "Ghi nhớ đăng nhập"; phiên chỉ trong bộ nhớ tab | Q1 đã chốt; trình duyệt không có kho bảo mật OS |
| E-05 | PRD §4 có 12 FR, 26 AC; Planning 80 task | MVP: 23 AC (14 AC gốc, có thu gọn + 9 AC CR-02), 18 task | CR-01 |
| E-06 | API v1.1: 44 endpoint | Hợp đồng 45 endpoint (thêm 1 của CR-02); **19 dùng trong MVP**, 26 gắn `x-mvp: deferred` | Không xóa endpoint khỏi hợp đồng |
| E-07 | `backend-plan.md` §3: FK composite chủ sở hữu cho `ai_drafts` | `ai_drafts.category_id` dùng **FK đơn**; quyền sở hữu kiểm ở service **trong cùng DB transaction**, có test chéo user | QC đã duyệt; ERD §3.4 cho phép "equivalent transactional backend checks" |
| E-08 | `backend-plan.md` §7: mật khẩu "argon2id/bcrypt — đề xuất" | **scrypt** N=2^15, r=8, p=1 (đáp ứng PRD §6, Architecture §10 "modern password-hashing algorithm") | QA đã duyệt; vận hành thực tế đo ở M0-05 |
| E-09 | D-19 (đề xuất): ảnh ≤ 10 MB; OQ-08 mở | `RECEIPT_MAX_BYTES` = 4 MB sau khi client nén | QD đã duyệt; giới hạn body nền tảng serverless |
| E-10 | 3 môi trường dev/test/prod (P4-TD-02) | dev/test (local + CI) và prod; Supabase thử nghiệm riêng cho spike | Tinh giản |
| E-11 | Planning: 5 gate | 3 gate (G1–G3) + nghiệm thu | CR-01 |

## 5. Giới hạn đã biết của MVP (ghi vào runbook)
1. Không có khoản thu, không sửa/xóa khoản chi; số dư ban đầu khóa sau khoản chi đầu tiên ⇒ **chi hết hoặc nhập nhầm thì không điều chỉnh được** trong MVP.
2. Expo Web: tải lại trang / đóng tab ⇒ phải đăng nhập lại (E-04).
3. AI Scan: nháp còn trên server nhưng **không có màn danh sách nháp** (endpoint liệt kê thuộc AI Chat, đã hoãn); tải lại trang khi đang sửa nháp ⇒ mất khả năng tiếp tục nháp đó. Nháp bị bỏ lại tồn tại trong DB cho tới khi có job retention (D-20, hoãn) — xem rủi ro R-M5 trong `planning-mvp.md`.
4. Dashboard: `monthly_income` luôn `"0"`, `budget_alerts` luôn `[]`.

## 6. Ảnh hưởng tài liệu
`planning-mvp.md` (mới), `definition-of-done.md`, `review-plan-report.md` §7–§8, ghi chú đầu `task-breakdown.md`, `phase-breakdown.md`, `test-strategy.md`, `backend-plan.md`, `frontend-plan.md`; `docs/decisions.md`, `docs/traceability.csv`, `docs/gates/*`, `README.md`. Bản Planning 3.2.2 gốc lưu tại `docs/planning/archive/revision-3.2.2/` (khớp `MANIFEST_SHA256.txt`).

Người ký: ____________________  Ngày: __________
