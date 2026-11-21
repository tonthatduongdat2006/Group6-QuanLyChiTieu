# Phase Breakdown
**Trạng thái:** Revision 3.2.2 (2026-11-20) – kế hoạch đã được nhóm phê duyệt; GROUP APPROVED. Quy mô dùng đơn vị tương đối (S/M/L); kế hoạch **không đưa lịch/ngày** vì package không nêu deadline/năng lực.
> **Nguồn đã đối chiếu trực tiếp:** bốn tài liệu v1.1; bằng chứng V-01…V-08 ở `review-plan-report.md` §9. PRD v1.1 là Approved business baseline. Những nội dung không thuộc PRD v1.1 (xóa danh mục, OAuth xã hội, icon/hạn của hũ, biểu đồ thu nhập 7 ngày/chọn kỳ) không được triển khai như phạm vi v1.



## 1. Cấu trúc Phase
Giữ **5 Phase và 80 task** (hai task có cổng đăng nhập xã hội của Revision 3 đã gỡ). Task có cổng quyết định: `P2-BE-09` (D-11, mặc định không làm), `P3-BE-10` (D-20).
| Điều chỉnh (giữ từ các revision trước) | Lý do |
|---|---|
| Cấu trúc repo ở **Phase 0** (P0-TD-01) | Test harness cần workspace |
| OpenAPI chung ở Phase 0 (P0-SH-02) | Một hợp đồng cho FE/BE; FE làm song song bằng mock |
| Phase 0 có gate riêng (P0-SH-03) | Đủ 5 cổng, không thêm task |
| Phase 2: Category → Transaction → Budget → Jar → Statistics → Dashboard | Số dư khả dụng phụ thuộc giao dịch nạp/rút hũ |
| Phase 3 tách 3A (Provider + Chat) và 3B (Scan) | Scan dùng lại Draft domain/Provider/Confirm |
**Thay đổi ở Revision 3.2 (ID giữ nguyên; cộng dồn các thay đổi của 3.1):**
- **Mapping idempotency đã đối chiếu trực tiếp ERD v1.1:** 14 cột thuộc 6 bảng; `create_*` chỉ ở `saving_jars`; `ai_messages` và `ai_draft_batches` dùng `idempotency_key` + `idempotency_request_hash`; confirm riêng ở `ai_drafts.confirm_*`; confirm-all ở `ai_draft_batches.confirm_all_*`. Bỏ header phản hồi tự thêm ở các revision trước. **D-06 giữ nguyên, không mở lại:** `PATCH /transactions/{transactionId}` + `receipt` là hợp đồng có sẵn của API v1.1; item fields gồm `item_name`, `amount`, `sort_order`. API v1.1: 44 endpoint, đếm trực tiếp từ §§2–10; SavingJar có 6 endpoint, không có PATCH/DELETE; Bearer count sẽ đếm từ OpenAPI generated.
- **Số dư không âm (D-07 đã duyệt theo PRD v1.1):** áp dụng cho tạo/sửa/xóa giao dịch, nạp hũ, xác nhận draft, confirm-all, AI Scan, sửa hóa đơn; mọi thất bại rollback toàn bộ. Task ảnh hưởng: P2-BE-02, P2-BE-03, P2-BE-05, P2-FE-04, P2-FE-05, P2-TD-01, P3-BE-02, P3-BE-05, P3-BE-06, P3-BE-08, P3-FE-04, P3-TD-01, P4-BE-03. Test mới `IT-BAL-GUARD`; `IT-CONC-BAL` viết lại để chứng minh số dư cuối không thể âm.
- **Idempotency theo API/ERD v1.1:** `409 IDEMPOTENCY_KEY_REUSED`; Idempotency-Key cho cả xác nhận draft và confirm-all; dùng đúng các trường ERD v1.1, không thêm cột trùng mục đích (P0-SH-02, P1-BE-01, P1-BE-03, P3-BE-04…07).
- **Gỡ khỏi phạm vi:** xóa danh mục, OAuth xã hội, `icon_key`/`target_date` của hũ, thống kê thu nhập 7 ngày/chọn kỳ (P1-BE-06, P2-BE-01, P2-BE-04, P2-BE-06, P2-FE-03/07/08, P2-TD-01, P1-TD-01, P1-SH-03). D-10: giữ biểu đồ chi tiêu 7 ngày theo PRD.
- **Thứ tự quyết định:** D-05 mapping idempotency đã được nhóm duyệt áp dụng theo ERD v1.1; không còn là decision gate (P0-SH-02); D-06 đã xử lý theo hợp đồng v1.1 nên không còn chặn task nào.

## 2. Các Phase
### Phase 0 – Chốt quyết định, hợp đồng, bootstrap & Test harness *(M)* — 9 task
- **Mục tiêu:** mặt bằng chung (Planning GROUP APPROVED; bộ nguồn v1.1 đã đối chiếu; OpenAPI v1.1 + contract delta D-12; repo + lockfile sau compatibility check; cấu hình kết nối Supabase PostgreSQL; harness, fixtures, CI).
- **Vào:** 4 tài liệu nguồn v1.1 đã được đối chiếu; Planning GROUP APPROVED; D-05 và D-12a/D-12b GROUP APPROVED (soft delete bằng `transactions.deleted_at`, giữ receipt child rows, DELETE 204 lần đầu/lặp); cần ghi nhận quyết định vào ERD/API/OpenAPI changelog trước migration; Supabase PostgreSQL + Vercel API là nền tảng đã chọn.
- **Ra:** OpenAPI (đủ endpoint API v1.1 và contract delta D-12) được kiểm tra kỹ thuật; repo xanh trên CI; `docs/stack-lock.md` + lockfile (chọn stable versions tương thích và khóa lockfile; smoke test Android/iOS đạt); harness BE/FE; AI fixtures; E2E spike; **gate P0-SH-03 được nhóm ký**.
- **Task:** P0-SH-01, P0-SH-02, P0-TD-01…06, P0-SH-03 (gate).
### Phase 1 – Foundation *(L)* — 16 task
- **Mục tiêu:** khung ứng dụng, schema theo ERD v1.1, Auth hoàn chỉnh (gồm remember-me).
- **Ra:** migration baseline áp dụng được **sau khi nhóm duyệt**; ràng buộc DB có test; E2E-01 xanh; app shell + API client + design system; ESLint ranh giới ECC; **gate P1-SH-03**.
- **Task:** P1-BE-01…06, P1-FE-01…06, P1-SH-01…03, P1-TD-01.
### Phase 2 – Core financial *(L+)* — 22 task
- **Mục tiêu:** FR-03…FR-09 trọn vẹn với **số dư không âm**.
- **Ra:** AC-04…AC-14 có test xanh; `IT-BAL-GUARD` và `IT-CONC-BAL` chứng minh số dư cuối không âm; thống kê đúng PRD (biểu đồ chi tiêu 7 ngày); **gate P2-SH-02**.
- **Task:** P2-BE-01…09 (09 mặc định không làm), P2-FE-01…10, P2-TD-01, P2-SH-01…02.
### Phase 3 – AI features *(L+)* — 23 task
- **3A:** P3-BE-01…06, P3-BE-10 (gated), P3-FE-01…05 → AC-15…AC-20. **3B:** P3-BE-07…09, P3-FE-06…08 → AC-21…AC-26 và AC-11. **Chung:** P3-SH-01, P3-TD-01…03, P3-SH-02.
- **Ra:** luồng AI bằng fake provider; xác nhận draft/confirm-all/Scan áp dụng quy tắc số dư và rollback; retry không tạo trùng; cùng key + ảnh khác → 409; chỉ còn fingerprint, không còn ảnh; **gate P3-SH-02**.
### Phase 4 – Tích hợp, hardening, regression, sẵn sàng phát hành *(M)* — 10 task
- **Ra:** `IT-AUTHZ` đủ mọi endpoint cần Bearer; regression AC-01…26 + NFR; regression đồng thời + số dư không âm; làn Android/iOS; hosting theo D-04b; **gate P4-SH-02**.
- **Task:** P4-BE-01…04, P4-FE-01…02, P4-TD-01…02, P4-SH-01…02.

## 3. Số lượng task (khớp `task-breakdown.md`)
| Phase | BE | FE | SH | TD | Tổng |
|---|---|---|---|---|---|
| P0 | 0 | 0 | 3 | 6 | **9** |
| P1 | 6 | 6 | 3 | 1 | **16** |
| P2 | 9 | 10 | 2 | 1 | **22** |
| P3 | 10 | 8 | 2 | 3 | **23** |
| P4 | 4 | 2 | 2 | 2 | **10** |
| **Tổng** | 29 | 26 | 12 | 13 | **80** |
Kiểm tra tự động số lượng, ID không trùng, phụ thuộc không vòng: `review-plan-report.md` §4.

## 4. Song song hóa & cổng Phase
Sau P0-SH-02, **FE và BE chạy song song** trong từng Phase (FE dùng MSW từ OpenAPI; tích hợp thật ở `*-SH-*`/`*-TD-01`). **Quy tắc cổng:** task Phase N+1 chỉ bắt đầu sau khi gate Phase N được **nhóm** ký (P0-SH-03, P1-SH-03, P2-SH-02, P3-SH-02, P4-SH-02); mỗi gate kiểm tra DoD-P, truy vết FR/AC/NFR của phase, danh sách D-xx còn mở, rủi ro mới. Claude không ký gate.
