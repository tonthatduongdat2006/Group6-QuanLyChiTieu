# Definition of Done
> **Thuật ngữ (Revision 4.0-MVP, S12):** trong file này (bản Revision 3.2.2), chữ "ECC" được dùng để chỉ kiến trúc frontend Rule/Store/Container/Presentational. Từ Revision 4.0, **ECC = Everything Claude Code** (bộ công cụ riêng cho Claude Code trong quy trình của giảng viên); kiến trúc ứng dụng gọi bằng tên đầy đủ **Rule/Store/Container/Presentational** (Solution Architecture v1.1 §5). Xem `planning-mvp.md` §0.
> **Revision 4.0-MVP (2026-11-24):** áp dụng cho 18 task trong `planning-mvp.md`. Đã sửa: DoD-T mục 5 (quy tắc số dư theo CR-02), §2 Backend (thêm thao tác thiết lập/sửa số dư ban đầu vào danh sách chạy guard), §3 mục 5 (gate G1–G3 + nghiệm thu). DoD-R (§4) áp dụng trong phạm vi CR-01: AC/E2E của chức năng hoãn không bắt buộc. Bản gốc: `archive/revision-3.2.2/definition-of-done.md`.
**Trạng thái:** Revision 3.2.2 (2026-11-20) – Planning package đã được nhóm phê duyệt (GROUP APPROVED). "Done" ở mọi cấp vẫn phải được xác nhận theo gate/DoD tương ứng; phê duyệt Planning không có nghĩa các task triển khai đã hoàn tất. **RV-xx** = yêu cầu sửa của lượt review Revision 2. **Nguồn đã đối chiếu trực tiếp:** bốn tài liệu v1.1; bằng chứng V-01…V-08 ở `review-plan-report.md` §9.

## 1. DoD-T – mỗi task
1. Đạt các Acceptance Criteria ở `task-breakdown.md` (cột AC) và nguồn FR/AC/NFR liên quan.
2. Có test theo cột Tests; test mới **xanh trên CI**; không test nào gọi live Claude.
3. Lint, typecheck sạch; không bỏ qua lỗi mà không ghi lý do.
4. **Tuân thủ ECC (FE):** Rule thuần + unit test; Store chỉ state client; Container điều phối API/side effect/loading/error; Presentational không gọi API, không đọc store, không chứa nghiệp vụ; ESLint ranh giới xanh. **Tuân thủ phân tầng (BE):** Controller / Service / Domain / Repository / Provider; không nghiệp vụ trong controller; không gọi Claude từ controller.
5. Không đổi hành vi nghiệp vụ đã duyệt (quy tắc số dư theo CR-02 — số dư ban đầu mặc định 0, người dùng xác nhận ≥ 0, `available = opening_balance − Σ khoản chi` trong MVP; **số dư khả dụng không âm**; hũ là luân chuyển nội bộ; AI không tự lưu; xác nhận từng draft/tất cả; confirm-all nguyên tử; Scan = 1 giao dịch + món; không lưu ảnh gốc; sửa hóa đơn bảo toàn Σ món = tổng). Mọi thay đổi hợp đồng/ERD ghi `contract-changelog.md`; thay đổi đã được nhóm quyết định (D-05/D-12) phải được phản ánh đúng, không mở lại biểu quyết. Các thay đổi mới ngoài quyết định đã duyệt vẫn đi theo quy trình change review. D-05, D-12a và D-12b đã được nhóm duyệt: áp dụng mapping idempotency ERD v1.1; soft delete transaction; giữ receipt child rows. Trước migration phải cập nhật ERD/API/OpenAPI changelog theo quyết định D-12 đã duyệt: `transactions.deleted_at`, giữ receipt child rows, DELETE HTTP 204 ở lần đầu/lặp; thực hiện review kỹ thuật tài liệu/migration, không xin phê duyệt lại quyết định nghiệp vụ đã chốt; không thêm cột idempotency trùng mục đích với trường ERD v1.1; Open Question và đề xuất tùy chọn (D-21…D-24) không được triển khai như yêu cầu.
6. Không có secret, ảnh hóa đơn hoặc dữ liệu cá nhân không cần thiết trong mã/log/fixture/bundle.
7. Cập nhật `docs/traceability.csv` (FR/AC/NFR ↔ task ↔ test).
8. Được review bởi ít nhất một thành viên khác; PR nhỏ, nêu phạm vi và giả định.

## 2. Checklist theo nhánh
| Nhánh | Bổ sung |
|---|---|
| **Frontend** | Presentational không import `api/stores/rules`; Rule có unit test; loading/empty/error đủ; tiền là chuỗi/BigInt; chuỗi tiếng Việt thống nhất; Idempotency-Key đúng vòng đời; invalidate chỉ sau thành công; remember-me đúng (bật: secure storage; tắt: bộ nhớ; **Expo Web MVP: tùy chọn bị ẩn — CR-01 E-04**); dọn cache ảnh sau quét; tổng tiền hóa đơn không sửa riêng |
| **Backend** | **Mọi đường ghi ảnh hưởng số dư chạy guard `projectedAvailableBalance ≥ 0` dưới khóa người dùng (tạo/sửa/xóa giao dịch, nạp hũ, xác nhận draft, confirm-all, AI Scan, sửa hóa đơn; MVP: tạo khoản chi, xác nhận AI Scan, thiết lập/sửa số dư ban đầu — CR-02); thất bại → rollback toàn bộ**; idempotency dùng **đúng bảng/cột ERD v1.1** (mapping 14 cột ở `backend-plan.md` §3.1; không gán `create_*` cho `ai_messages`/`ai_draft_batches`; không thêm cột; không thêm response header), cùng key + payload khác → `409 IDEMPOTENCY_KEY_REUSED` (kể cả AI Scan qua SHA-256 ảnh, không lưu ảnh); Idempotency-Key cho cả confirm và confirm-all; DTO validate; `user_id` từ token; 404 cho tài nguyên không thuộc chủ; DB transaction đúng ranh giới; lỗi ánh xạ đúng mã; log che dữ liệu nhạy cảm |
| **DB** | Ràng buộc/index theo ERD; CHECK dương; FK/on-delete đúng: draft→transaction `SET NULL`; transaction→receipt child giữ liên kết khi soft delete, không cascade-delete trong luồng xóa người dùng; soft-delete marker `transactions.deleted_at` phải được đặc tả trong ERD/API change; không lưu ảnh/URL/khóa file; chỉ thêm cột đã được duyệt |
| **AI** | Đầu ra model là dữ liệu không tin cậy và được validate; AI không tạo/xác nhận giao dịch; test bằng fixtures; khóa AI chỉ ở backend; retry không tạo batch/draft trùng; hủy/lỗi không để lại ảnh |
| **Shared/Integration** | OpenAPI cập nhật + client sinh lại; contract test xanh; sai khác được báo cáo, không tự chọn hành vi |
| **Test/DevOps** | Phiên bản khóa đúng `docs/stack-lock.md`; chọn các phiên bản stable tương thích sau khi kiểm tra tại thời điểm bootstrap, smoke test tương thích đã chạy trước khi chốt Expo SDK; không khóa cứng patch/major chưa được xác minh; Pipeline xanh; dữ liệu test xác định; không phụ thuộc mạng ngoài; làn Android trên CI, iOS theo năng lực CI hoặc checklist PLAT |

## 3. DoD-P – mỗi Phase (gate)
1. Mọi task của Phase đạt DoD-T; AC/FR/NFR của Phase có test xanh theo ma trận ở `review-plan-report.md` §3.
2. Regression của các Phase trước vẫn xanh.
3. Danh sách D-xx/OQ còn mở được cập nhật; **không OQ nào bị coi là đã duyệt ngầm**; mọi đề xuất kỹ thuật được đánh dấu "chờ duyệt" cho tới khi nhóm xác nhận.
4. Rủi ro mới được ghi vào `risk-register.md`; kiểm tra tự động (ID task không trùng, phụ thuộc không vòng, FR/AC có task+test) xanh.
5. **Nhóm ký gate hoàn thành từng Phase** (đây là nghiệm thu kết quả triển khai, khác với phê duyệt Planning đã hoàn tất). **Revision 4.0-MVP:** `G1` (M0-06), `G2` (M1-G), `G3` (M2-G), `Nghiệm thu` (M3-03) — thay cho `P0-SH-03`, `P1-SH-03`, `P2-SH-02`, `P3-SH-02`, `P4-SH-02` của Revision 3.2.2. Task có cổng quyết định chưa kích hoạt vẫn được hoãn có chủ đích. Task Phase kế tiếp không bắt đầu trước khi gate được ký.

## 4. DoD-R – phát hành (v1)
1. AC-01…AC-26 và 5 NFR (SEC/PERF/INT/PRI/USA) đều có test tự động xanh; E2E-01…12 xanh trên Android; iOS đạt theo năng lực CI hoặc checklist PLAT-01…06.
2. Các bất biến (`backend-plan.md` §4) đều có test; `IT-AUTHZ` phủ **mọi** endpoint cần Bearer trong OpenAPI; `IT-BAL-GUARD` và `IT-CONC-BAL` chứng minh số dư không bao giờ âm; IT-CONC, IT-IDEM, IT-IDEM-AI, IT-SCAN-IDEM, IT-SCAN-REPLAY, IT-TX-RECEIPT-EDIT, IT-PRIV xanh.
3. Không có ảnh hóa đơn trong DB/log/đĩa/cache ứng dụng sau xử lý; không có secret trong repo/bundle; khóa AI chỉ ở backend.
4. Ba môi trường dev/test/prod tách biệt; backup/restore có kế hoạch và đã thử theo D-20; hosting theo D-04b.
5. OQ/quyết định còn mở (quên mật khẩu, xóa tài khoản, sửa/xóa hũ, retention…) và các đề xuất tùy chọn ngoài phạm vi (D-21…D-24) được ghi rõ là **hoãn có chủ đích hoặc không đưa vào v1**, không để trạng thái ngầm.
6. Tài liệu vận hành (`runbook`), biến môi trường và hướng dẫn chạy có sẵn.
7. Báo cáo review cuối (P4-SH-02) được nhóm chấp thuận.
