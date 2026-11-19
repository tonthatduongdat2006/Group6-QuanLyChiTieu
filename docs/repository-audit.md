# Repository Audit Report
**Dự án:** Quản Lý Chi Tiêu – AI Smart Expense · **Giai đoạn:** Step 3 – Planning · **Ngày:** 2026-11-10
**Trạng thái:** Revision 3.2.1 (2026-11-20) – bản nháp kế hoạch, chưa được nhóm duyệt.
> **Nguồn đã đối chiếu trong Revision 3.2.1:** bốn tài liệu nguồn v1.1 (`02_PRD_v1.1.md`, `03_Solution_Architecture_v1.1.md`, `04_Database_Schema_ERD_v1.1.md`, `05_API_Documentation_v1.1.md`) đã được đọc trực tiếp; bằng chứng ở `review-plan-report.md` §9. Bộ planning Revision 3.2 có historical inventory v1.0; các file v1.0 chỉ được ghi nhận cho lịch sử, không dùng làm baseline khi mâu thuẫn với v1.1. Không có repository mã nguồn trong gói planning được kiểm toán; đây là package/input audit, không phải audit repository code.



## 1. Kết luận
**Không có repository mã nguồn trong gói đầu vào.** Vì vậy không thể audit code hiện hữu; dự án được coi là **greenfield** cho mục đích planning. Bốn tài liệu v1.1 được kiểm tra riêng để chốt baseline; mọi đường dẫn file/module trong kế hoạch vẫn là **đề xuất**, không chứng minh repo code đã tồn tại.

## 2. Kiểm kê package đầu vào (thay thế cho repo audit)
| # | File (upload) | Kích thước | ID / phiên bản | Vai trò | Ghi nhận |
|---|---|---|---|---|---|
| 00 | `00_README_Claude_Planning_Input.md` | 5,063 B | Package v1.0, 2026-11-10 | Hướng dẫn package | Đường dẫn trong README là `docs/…v1.0.md`, file upload tên phẳng `…v1_0.md` (chỉ khác tên). |
| 01 | `01_Prototype_Reference.html` | 61,239 B | Không có số phiên bản | Tham chiếu giao diện, bố cục, tương tác (**không phải nguồn nghiệp vụ**) | README nói đây là bản upload 2026-11-08 và không xác minh được có bản mới hơn. **Không chặn kế hoạch (RV-01):** nếu nhóm không cung cấp bản mới, tiếp tục dùng file này làm tham chiếu giao diện; chức năng PRD mà file này không có được thiết kế mới theo PRD. |
| 02 | `02_PRD_v1_0.md` | 15,326 B | QLCT-PRD-001 v1.0 | Historical input v1.0 — không dùng làm business baseline; đối chiếu current `02_PRD_v1.1.md` tại §9 của review report | FR-01…FR-12, AC-01…AC-26, OQ-01…OQ-09 (v1.0). v1.0 im lặng về số dư âm; theo yêu cầu 3.1 PRD v1.1 quy định số dư khả dụng không được âm. Revision 3 từng coi 5 nội dung (REQ-X) là yêu cầu PRD — **không đúng với PRD v1.1** và đã gỡ. |
| 03 | `03_Solution_Architecture_v1_0.md` | 10,223 B | QLCT-ARCH-001 v1.0 | Historical input v1.0 — đối chiếu current source v1.1 tại review report §9 | Kiến trúc/assumptions của bản cũ; thay bằng hướng đã được đối chiếu ở Architecture v1.1. |
| 04 | `04_Database_Schema_ERD_v1_0.md` | 12,501 B | QLCT-DB-001 v1.0 | Historical input v1.0 — đối chiếu current source v1.1 tại review report §9 | 14 bảng (đã đếm khớp); có `idempotency_key` ở `transactions`, `jar_transactions`, `ai_draft_batches`. |
| 05 | `05_API_Documentation_v1_0.md` | 16,337 B | QLCT-API-001 v1.0 | Historical input v1.0 — đối chiếu current source v1.1 tại review report §9 | 45 endpoint (đã đếm); 4 công khai, 41 cần Bearer. |
| – | `06_CLAUDE_PLANNING_PROMPT.md` | – | – | Prompt nhiệm vụ | Không nằm trong danh sách upload; nội dung prompt được cung cấp trực tiếp trong hội thoại và được áp dụng. Không phải nguồn sự thật. |

## 3. Audit kỹ thuật prototype (01)
- **Công nghệ:** một file HTML, React 18.3.1 (UMD) + htm 3.1.1 từ CDN, không build; dữ liệu lưu `localStorage` (khoá `qlct_v1`). Chỉ là prototype web, **không phải** React Native.
- **Màn hình/luồng:** Auth (đăng ký/đăng nhập), Home, Add (thu/chi), Budget (+form), Hist, Stats, Jars (+tạo, +chi tiết nạp/rút), Cats (+thêm), Me, AI (Chat + Quét hóa đơn), cùng modal Confirm/AiChoice.
- **Điều hướng:** thanh tab dưới *Trang chủ · Thống kê · (+) · Ngân sách · Cá nhân*; Danh mục/Lịch sử/Hũ truy cập từ Home hoặc Cá nhân; AI vào qua banner ở Home → sheet chọn Chat/Quét.
- **Design tokens (CSS variables):** primary `#2F6FED`, success `#1BAA63`, danger `#E5484D`, warning `#F59E0B`, nền `#F2F5FB`, font Inter, hỗ trợ light/dark, bố cục tối đa 430 px.
- **Dùng lại làm tham chiếu:** IA/điều hướng, chuỗi tiếng Việt & thông báo lỗi, mẫu tương tác (khóa chống bấm đúp, `op` id ~ idempotency, hộp thoại xác nhận, màn hình thành công, cảnh báo ngân sách), danh mục mặc định kèm icon/màu.
- **Không mang sang bản thật:** lưu `localStorage`; mật khẩu plaintext; gọi AI trực tiếp từ client (`window.claude`/`AI_ENDPOINT`); nút "Điền tài khoản demo"/"Đặt lại dữ liệu demo"; `parseInt` cho tiền; định dạng `de-DE` thay `vi-VN`.
- **Đối chiếu prototype (v1.0 baseline):** prototype không có đăng nhập Google/Facebook, xóa danh mục, hạn hoàn thành của hũ hay chuyển kỳ tuần/tháng; có biểu đồ 7 ngày cho cả chi tiêu và thu nhập, biểu tượng hũ, số giao dịch + tổng tháng ở màn Danh mục. Theo PRD v1.1 đã đọc trực tiếp (FR-05/08/09, §7) các mục không thuộc PRD (xóa danh mục, OAuth xã hội, biểu tượng/hạn của hũ, biểu đồ thu nhập/chọn kỳ) **không** mang sang; prototype cũng cho phép chi tiêu làm số dư âm ở luồng thêm giao dịch — **sai** so với quy tắc số dư không âm.
- **Lịch sử API/ERD v1.0 (chỉ để ghi nhận khác biệt; không dùng làm contract hiện tại):** API v1.0: danh mục không có xóa/đổi tên; `GET /statistics/categories` chỉ amount + percentage; `daily-expenses` chỉ chi tiêu; `POST /saving-jars` chỉ name/target_amount/initial_deposit; ERD v1.0 lịch sử có ít trường idempotency hơn; dùng mapping đầy đủ của ERD v1.1 ở backend-plan §3.1.
- **Theo yêu cầu 3.2 (chưa đối chiếu file):** API v1.1 có 44 endpoint, có `PATCH /transactions/{transactionId}` với `amount` + `receipt{merchant_name, items}`, `409 IDEMPOTENCY_KEY_REUSED`, Idempotency-Key cho confirm/confirm-all; ERD v1.1 có 14 cột idempotency: `transactions` (`idempotency_key`, `idempotency_request_hash`), `saving_jars` (`create_idempotency_key`, `create_request_hash`), `jar_transactions` (`idempotency_key`, `idempotency_request_hash`), `ai_messages` (`idempotency_key`, `idempotency_request_hash`), `ai_draft_batches` (`idempotency_key`, `idempotency_request_hash`, `confirm_all_idempotency_key`, `confirm_all_request_hash`), `ai_drafts` (`confirm_idempotency_key`, `confirm_request_hash`).
- **Sai khác so với PRD đã duyệt:** xem `review-plan-report.md` §2 (P-01…P-12). PRD là nguồn nghiệp vụ chuẩn; prototype chỉ dùng cho giao diện/bố cục/tương tác. Ba điểm prototype hành xử ngược PRD cần đặc biệt tránh mang sang: số dư bỏ qua hũ, nạp hũ không kiểm số dư khả dụng, AI tự gợi ý danh mục khi quét hóa đơn; biểu đồ thu nhập 7 ngày ở tab Thu nhập cũng **không** được thêm (RV-08).

## 4. Checklist sẽ chạy khi có repository
Cấu trúc thư mục & workspace · cấu hình TS/ESLint/format · phiên bản dependency (so với bản stable thời điểm triển khai) · test hiện có & độ phủ · CI · quản lý env/secret (quét secret) · so sánh Prisma schema với ERD (14 bảng, ràng buộc) · so sánh route với OpenAPI · lịch sử git · tuân thủ ECC (ranh giới Rule/Store/Container/Presentational).
