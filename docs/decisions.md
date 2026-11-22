# Decision Log – AI Smart Expense

**Task:** P0-SH-01 · **Cập nhật:** 2026-11-23
**Baseline Planning:** Revision 3.2.2 – GROUP APPROVED (`docs/*.md`, hash theo `docs/baseline/MANIFEST_SHA256.txt`)
**Baseline nguồn:** PRD / Solution Architecture / ERD / API Documentation **v1.1** (`docs/sources/`, chỉ đọc)

> File này ghi nhận quyết định, không tạo quyết định mới. Trạng thái của từng mục ghi đúng theo nguồn; mục nào chưa được nhóm duyệt thì ghi rõ "chờ nhóm".

> **Phân biệt:** ngày 2026-11-23 nhóm GROUP APPROVED D-16, D-04a, Q1–Q4 và ghi nhận DV-01. Đây là phê duyệt quyết định, **không phải** ký gate Phase 0. **Gate P0-SH-03 chưa được ký**; task Phase 1 chưa được bắt đầu (`phase-breakdown.md` §4).

## 1. Baseline

| Mục | Nội dung | Trạng thái | Nguồn |
|---|---|---|---|
| B-01 | Planning Revision 3.2.2 (gói `Group_Approved`) là baseline chính thức; không quay lại Revision 3.2.1 | GROUP APPROVED; xác nhận lại bởi chỉ đạo ngày 2026-11-21 (Q1); nhóm xác nhận Q1 ngày 2026-11-23 | `docs/baseline/PACKAGE_README_3.2.2.md`, `docs/baseline/SYNC_REPORT_3.2.2.md` |
| B-02 | Nguồn nghiệp vụ/kỹ thuật là bộ v1.1; PRD v1.1 là Approved business baseline (D-25) | GROUP APPROVED | `review-plan-report.md` §7 |
| B-03 | Bốn file nguồn v1.1 trong `docs/sources/` được giữ nguyên byte; không sửa | – | `docs/sources/README_READ_FIRST.txt` |

## 2. Quyết định nhóm đã duyệt (không mở lại)

| ID | Quyết định | Nguồn |
|---|---|---|
| D-05 | Idempotency dùng đúng 14 cột trên 6 bảng theo ERD v1.1; không thêm cột/bảng/response header | `backend-plan.md` §3.1; `review-plan-report.md` §3 |
| D-06 | Sửa giao dịch hóa đơn qua `PATCH /transactions/{transactionId}` + `receipt{merchant_name, items[]}`; items là full replacement, gồm `item_name`, `amount`, `sort_order` | API v1.1 §5; `backend-plan.md` §5.3 |
| D-07 | Số dư khả dụng không bao giờ âm; mọi thao tác vi phạm → `422 INSUFFICIENT_BALANCE` và rollback | PRD v1.1 FR-03/04; `backend-plan.md` §5.1 |
| D-10 | Thống kê theo ngày chỉ là biểu đồ chi tiêu 7 ngày | PRD v1.1 FR-08 |
| D-11 | Không có PATCH/DELETE cho saving jars trong v1 | PRD v1.1 FR-09, §7; API v1.1 §7, §14 |
| D-12a | Xóa giao dịch là soft delete bằng `transactions.deleted_at`; DELETE trả 204 ở lần đầu và lần lặp; từ chối nếu số dư dự kiến âm; không có restore trong v1 | `backend-plan.md` §3, §5.3; `task-breakdown.md` P1-BE-01 |
| D-12b | Giữ `receipt_details`/`receipt_items` của giao dịch đã soft delete; không cascade xóa | như trên |
| Nền tảng | Supabase cung cấp PostgreSQL; Vercel host NestJS API; Expo là ứng dụng mobile, không deploy lên Vercel; **không dùng Supabase Auth** | `backend-plan.md` §11; `frontend-plan.md` (ranh giới triển khai); `review-plan-report.md` §0, §10 |
| Ràng buộc kèm theo | Không dùng Supabase Storage (ảnh hóa đơn không lưu lâu dài, không cần object storage trong v1); mobile chỉ gọi REST API của backend, không kết nối DB trực tiếp | Architecture v1.1 §1, §8, §11; PRD v1.1 FR-11; chỉ đạo 2026-11-21 |
| D-02 | Monorepo pnpm: `apps/api`, `apps/mobile`, `packages/contracts` (đúng như repo đã dựng) | Mặc định đề xuất loại ② trong `review-plan-report.md` §7; **cấu trúc đã triển khai, nhóm xác nhận tại gate P0-SH-03** |
| D-16 | Thư viện FE + E2E: chấp nhận toàn bộ cấu hình mặc định tại `frontend-plan.md` §10 (Expo Router, TanStack Query v5, Zustand, react-native-svg, Expo libraries, Jest, jest-expo, RNTL, MSW, Maestro). **GROUP APPROVED ngày 2026-11-23.** Chưa chốt patch version: phiên bản cụ thể phải qua compatibility check và smoke test (D-03) | `frontend-plan.md` §10; xác nhận nhóm 2026-11-23 |
| D-04a | Nhà cung cấp CI: **GitHub Actions. GROUP APPROVED ngày 2026-11-23.** Pipeline (P0-TD-05) chưa được xem là hoàn thành | `review-plan-report.md` §7; xác nhận nhóm 2026-11-23 |

## 3. Chỉ đạo triển khai ngày 2026-11-21 (người điều phối dự án)

Các mục dưới đây là chỉ đạo thực thi trong Phase 0 của người điều phối ngày 2026-11-21. **Nhóm đã GROUP APPROVED Q1–Q4 ngày 2026-11-23.** Việc phê duyệt này không thay thế việc ký gate P0-SH-03 (chưa ký).

| ID | Chỉ đạo | Tác động lên Planning | Trạng thái nhóm |
|---|---|---|---|
| Q1 | Planning 3.2.2 Group Approved là baseline; gói "Source v1.2 Synced" chưa được dùng (xem §5, I-01) | Không đổi | GROUP APPROVED 2026-11-23 |
| Q2 | DB cho local/test: **PostgreSQL cài trực tiếp trên ổ D:**; không dùng Docker Desktop, không dùng WSL; không ghi bất kỳ file nào vào ổ C:. Phiên bản và mọi thư mục phải được trình bày và xác nhận trước khi cài | **Lệch** khỏi mô tả phạm vi P0-TD-01 ("`docker-compose` PostgreSQL dùng cho local/test"). Mục đích của task (PostgreSQL thật cho local/test) giữ nguyên; chỉ đổi cách cung cấp. CI vẫn dùng PostgreSQL service container (P0-TD-05) | GROUP APPROVED 2026-11-23 **chỉ cho phương thức** (native trên D:). Chưa chọn phiên bản, chưa chốt thư mục, **chưa cài**; phải trình bày phiên bản và đầy đủ thư mục để xin phép trước khi cài |
| Q3 | Được bổ sung `@types/express` 4.x, công cụ commit hook, `@redocly/cli`; chỉ dùng pnpm, store/cache trên ổ D:, cập nhật `pnpm-lock.yaml`; không dùng npm global; không chạy lệnh tự sửa file khi chưa xem diff | Không đổi (thuộc D-03/P0-TD-01, P0-SH-02) | GROUP APPROVED 2026-11-23 |
| Q4 | `Idempotency-Key` cho `POST /saving-jars/{jarId}/deposits` và `/withdrawals` giữ **tùy chọn** theo API v1.1 §7 | Đã chỉnh `test-strategy.md` IT-IDEM (d) cho khớp API (xem `docs/baseline/PLANNING_DEVIATIONS.md`, DV-01). Không chuyển thành bắt buộc, không ghi D-15 là đã duyệt | GROUP APPROVED 2026-11-23 |

## 4. Quyết định loại ② còn chờ nhóm (theo `review-plan-report.md` §7)

| ID | Nội dung | Trạng thái hiện tại | Cần trước |
|---|---|---|---|
| D-03 | Phiên bản stack | Đang ghi bằng chứng trong `docs/stack-lock.md`; nhóm review tại P0-SH-03 | P0-TD-01 |
| D-08 | Ngân sách theo tháng, không tự lặp | Mặc định đề xuất | P2-BE-04 |
| D-13a/b | Remember-me; access/refresh token | Mặc định đề xuất | P1-BE-04, P1-FE-04 |
| D-14 | Danh mục mặc định + chuẩn hóa tên | Mặc định đề xuất | P1-BE-06 |
| D-15 | Quy ước/mã lỗi mở rộng (`DRAFT_NOT_CONFIRMABLE`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`) | **Chưa duyệt**; không dùng như contract | P0-SH-02 |
| D-17 | Cấu hình AI | Mặc định đề xuất | P3-BE-01 |
| D-18 | Ngữ nghĩa AI Chat | Mặc định đề xuất | P3-BE-03 |
| D-19 | Luật hóa đơn (định dạng, kích thước) | Mặc định đề xuất | P3-BE-07 |

D-04a và D-16 đã chuyển lên §2 (GROUP APPROVED 2026-11-23).

Loại ③ hoãn có chủ đích: D-09 (OQ-10), D-12c/D-13c/D-13d (OQ-02/03), D-20 (OQ-06/07/09), D-21…D-24 (ngoài phạm vi v1).

## 5. Vấn đề mở cần xử lý (không phải quyết định)

| ID | Vấn đề | Đề xuất xử lý |
|---|---|---|
| I-01 | Gói `AI_Smart_Expense_Planning_Revision_3.2.2_Source_v1.2_Synced` tự ghi "PENDING GROUP REVIEW", tham chiếu `02…05_v1.2.md` **không có trong bất kỳ gói nào**, bỏ dòng Supabase/Vercel ở P0-TD-01/P4-TD-02 và ghi "D-05 phải có kết luận nhóm" ở P0-SH-03 (trái với D-05 đã duyệt) | Không dùng làm baseline; không coi nội dung của nó là quyết định đã duyệt. Nhóm cần cung cấp 4 tài liệu v1.2 và quyết định có duyệt gói này hay không |
| I-02 | OQ-12 được nhắc trong gói 3.2.2 nhưng không có trong nguồn hay Planning | Giữ nguyên ghi chú của `review-plan-report.md`; không tự tạo nội dung |
| I-03 | ERD/API v1.1 chưa có `transactions.deleted_at` và mã 204 của D-12a; Planning yêu cầu đồng bộ ERD/API/OpenAPI changelog trước migration | `packages/contracts/contract-changelog.md` §6 đã ghi; nguồn v1.1 giữ nguyên. Kiểm lại tại P0-SH-02 và trước P1-BE-01 |
| I-05 | `review-plan-report.md` 3.2.2 lặp heading "## 0.3 Phạm vi đồng bộ Revision 3.2.2" ba lần (dòng 6, 14, 22) | Lỗi trình bày, không ảnh hưởng nội dung; giữ nguyên file đã duyệt, sửa ở revision kế tiếp nếu nhóm muốn |
| I-04 | Rủi ro Vercel cho các phase sau: giới hạn kích thước request body so với D-19 (≤ 10 MB), thời gian chạy function so với timeout AI (D-17), cần dùng pooler của Supabase cho serverless | Kiểm tra theo tài liệu Vercel/Supabase hiện hành trước P3-BE-07 và P4-TD-02 |
