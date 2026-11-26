# Sổ quyết định áp dụng khi code

> **Revision 4.0-MVP (2026-11-24):** bảng chính là §A (quyết định hiện hành cho MVP). Bảng cũ của Phase 0–1 (Revision 3.2.2) giữ ở §B để truy vết; dòng nào bị thay thế đã ghi rõ.

## A. Quyết định hiện hành (Revision 4.0-MVP)

| ID | Trạng thái | Nội dung | Tài liệu | Áp dụng trong code (task) |
|---|---|---|---|---|
| D-26 | ① Nhóm duyệt 2026-11-24, ký tại G1 | Phạm vi MVP, 18 task, 19 endpoint, ngoại lệ E-01…E-11, giới hạn đã biết | `change-requests/CR-01-mvp-scope.md` | Mọi task |
| D-27 | ① Nhóm duyệt 2026-11-24, ký tại G1 | Số dư ban đầu OB-1…OB-10; công thức `opening_balance − Σ khoản chi`; 2 thông báo | `change-requests/CR-02-opening-balance.md` | M0-02, M0-03, M1-01…03, M2-03, M2-04 |
| D-28/QA | ① | scrypt N=2^15, r=8, p=1; đo vận hành ở M0-05 | `planning-mvp.md` §1.1 | Đã có (`password.ts`); M0-05 |
| D-28/QB | ① | Refresh xoay vòng; reuse sau grace 10 s → thu hồi mọi phiên; trong grace → 401, không cấp token | §1.1, IT-AUTH-REFRESH | Đã có (`tokens.ts`, `auth.service.ts`); M0-04 bổ sung test ca (2) |
| D-28/QC | ① | `ai_drafts.category_id` FK đơn; kiểm sở hữu trong transaction; IT-DRAFT-AUTHZ | E-07 | Schema đã có; M2-03 |
| D-28/QD | ① | `RECEIPT_MAX_BYTES` = 4 MB; throttle auth 10/phút/IP; scan 20/giờ/user | E-09 | M2-02, M3-01 (code hiện có `.env.example` = 10 MB → sửa ở M2-02) |
| D-28/QE | ① | 10 danh mục chi mặc định | §1.1 | Đã có (`category-rules.ts`) |
| D-28/QF | ① | K3 (guard tra phiên), K4 (CHECK theo bất biến, §7.2), K6 (định dạng key), K10b (Prisma Migrate), C1–C3 (CR-02), C7 (Playwright) | §1.1, §7 | K3, K6 đã có; K4, K10b ở M0-03; C1–C3 ở M0-02/M0-03/M1-01; C7 ở M0-04 |
| Q1 | ① | Ẩn "Ghi nhớ đăng nhập" trên Expo Web | E-04 | M0-04 (`LoginForm.tsx`) |
| XN-1 | Chưa có bằng chứng | Trạng thái migration trên DB thật | `planning-mvp.md` §7.1 | M0-03 bước 1 |

## B. Bảng Phase 0–1 (Revision 3.2.2, giữ để truy vết)

Nguồn: `docs/planning/review-plan-report.md` §7 (Revision 3.2.2, GROUP APPROVED) và 4 tài liệu v1.1 trong `docs/sources/`.
Claude không ký gate; chỉ nhóm ký. Cột "Áp dụng trong code" cho biết repo này đã làm theo quyết định ở đâu.

| ID | Trạng thái | Nội dung áp dụng | Áp dụng trong code |
|---|---|---|---|
| D-02 | ② đề xuất → dùng | Monorepo pnpm: `apps/mobile`, `apps/api`, `packages/contracts` | cấu trúc repo |
| D-03 | ② | Stable versions tương thích, khóa lockfile, smoke test | `docs/stack-lock.md` (**chưa smoke test**) |
| D-04a | ② | GitHub Actions | `.github/workflows/ci.yml` |
| D-04b | đã chọn | API trên Vercel, DB trên Supabase PostgreSQL; không dùng Supabase Auth | MVP: kiểm chứng ở M0-05 trước khi dùng (không mặc định đáp ứng) |
| D-05 | ① APPROVED | 14 cột idempotency / 6 bảng theo ERD v1.1 | `apps/api/prisma/schema.prisma` |
| D-06 | ① | Sửa hóa đơn qua `PATCH /transactions/{id}` + `receipt.items` full replacement | OpenAPI; code ở P3-BE-08 |
| D-07 | ① | Số dư khả dụng không âm; khóa `users` FOR UPDATE | MVP: M1-01 (`BalanceGuard`) |
| D-08 | ② | Ngân sách theo bản ghi tháng, không tự lặp | Phase 2 |
| D-09 | ③ | Không áp cutoff ngày tương lai | `common/dates` chỉ kiểm ngày hợp lệ |
| D-10 | ① | Chỉ biểu đồ chi tiêu 7 ngày | OpenAPI `/statistics/daily-expenses` |
| D-11 | ③ | Không PATCH/DELETE hũ | OpenAPI + `check-openapi.mjs` |
| D-12a | ① APPROVED | Soft delete qua `transactions.deleted_at`; DELETE 204 cả lần lặp | schema + contract-changelog |
| D-12b | ① APPROVED | Giữ receipt child rows; FK `RESTRICT`, không cascade | migration |
| D-13a | ② → giới hạn bởi E-04 | Remember-me: bật → SecureStore; tắt → bộ nhớ. **Expo Web: ẩn tùy chọn** | `apps/mobile/src/api/session.ts` |
| D-13b | ② | Access JWT ngắn hạn; refresh xoay vòng, lưu SHA-256, phát hiện dùng lại → thu hồi | `apps/api/src/modules/auth` |
| D-14 | ① (QE) | 10 danh mục chi mặc định đã chốt; chuẩn hóa NFC + lowercase + trim + gộp khoảng trắng, giữ dấu | `modules/category/category-rules.ts` |
| D-15 | ② | Chỉ 15 mã lỗi của API v1.1 §12 | `common/errors/error-codes.ts` |
| D-16 | ② (E2E đổi bởi E-03) | Expo Router, TanStack Query v5, Zustand, Jest + RNTL + MSW; E2E: **Playwright** (Maestro hoãn) | `apps/mobile/package.json` |
| D-17 | ② | Model id qua config (`AI_MODEL_CHAT`, `AI_MODEL_SCAN`) | `.env.example`; code ở Phase 3 |

**Lựa chọn kỹ thuật của repo (Revision 3.2.2) — trạng thái sau D-28:**
- Băm mật khẩu bằng `scrypt` của Node (`N=2^15, r=8, p=1`). Đây là KDF tốn bộ nhớ, có sẵn trong Node nên không cần build native trên Vercel. Có thể thay bằng argon2id (`@node-rs/argon2`) mà không phải đổi DB, vì chuỗi hash có tiền tố thuật toán.
- Refresh token = 32 byte ngẫu nhiên (base64url). Mỗi lần refresh tạo phiên mới và thu hồi phiên cũ. Nếu token cũ bị dùng lại **sau** `REFRESH_REUSE_GRACE_SECONDS`, toàn bộ phiên của user bị thu hồi. Nếu dùng lại trong thời gian grace, chỉ trả 401: đây là trường hợp hai request refresh đua nhau, không phải bị đánh cắp.
- Prisma 6 (`prisma-client-js`). Có thể nâng lên Prisma 7 ở bước khóa phiên bản nếu smoke test đạt.
- **Đã chốt (D-28):** scrypt (QA) và chính sách refresh (QB) ở trên được nhóm giữ nguyên.
- **Không còn hiệu lực (K10b):** migration baseline viết tay phải được thay/đối chiếu bằng Prisma Migrate theo `planning-mvp.md` §7.
