# AI Smart Expense — Quản Lý Chi Tiêu

Monorepo thực thi theo **Planning Revision 4.0-MVP** (`docs/planning/planning-mvp.md`: 18 task, 4 phase M0–M3, gate G1–G3 + nghiệm thu).
Căn cứ: 4 tài liệu nguồn v1.1 trong `docs/sources/` (**không sửa**) + change request `docs/change-requests/CR-01-mvp-scope.md` (phạm vi, ngoại lệ) và `CR-02-opening-balance.md` (số dư ban đầu).
Planning Revision 3.2.2 (80 task) lưu nguyên vẹn ở `docs/planning/archive/revision-3.2.2/`.

## Phạm vi MVP
- Đăng ký / đăng nhập / đăng xuất. Trên Expo Web **không có** "Ghi nhớ đăng nhập" (tải lại trang phải đăng nhập lại).
- Thiết lập số dư ban đầu (≥ 0; sửa được trước khoản chi đầu tiên, sau đó khóa).
- Thêm và xem khoản chi; Dashboard tối thiểu. Số dư: `available_balance = opening_balance − Σ khoản chi đã xác nhận`.
- AI Scan: tải ảnh hóa đơn (≤ 4 MB sau nén), sửa nháp, xác nhận lưu (cùng quy tắc số dư).
- Phát hành: **Expo Web** qua URL công khai; giảng viên tự đăng ký (không có tài khoản demo).
- **Hoãn:** khoản thu, sửa/xóa khoản chi, ngân sách, hũ, thống kê, AI Chat, tạo danh mục. Giới hạn đã biết: CR-01 §5.

> **Thuật ngữ:** "ECC" = Everything Claude Code (bộ công cụ cho Claude Code, chưa cài trong môi trường hiện tại); kiến trúc frontend của app là Rule/Store/Container/Presentational (Solution Architecture §5). Xem `docs/planning/planning-mvp.md` §0.
>
> **Trạng thái (2026-11-24):** 5 chức năng MVP đã có code backend + frontend và đã chạy thử đầu-cuối trên Expo Web + API + PostgreSQL 16 **cục bộ**, với AI **giả lập** (`AI_PROVIDER=fake`). Chưa deploy lên URL công khai và chưa gọi Claude thật (cần tài khoản Vercel/Supabase và khóa Claude API — xem `docs/runbook.md`).

```
apps/api/            NestJS + Prisma (PostgreSQL / Supabase) — REST /api/v1
apps/mobile/         Expo + React Native + expo-router — kiến trúc Rule/Store/Container/Presentational
packages/contracts/  openapi.yaml (45 endpoint) + AI fixtures + kiểu TS sinh tự động
e2e/                 web/mvp.e2e.cjs (Playwright, Expo Web) · *.yaml Maestro (hoãn)
docs/                sources (read-only), planning, decisions, stack-lock, traceability, gates
```

## Chạy lần đầu (máy cá nhân)
Yêu cầu: Node 22, pnpm 10.18 (`corepack enable`), PostgreSQL 16 (Docker hoặc cài sẵn).

```bash
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env          # điền JWT_ACCESS_SECRET ≥ 32 ký tự; AI_PROVIDER=fake nếu chưa có khóa Claude
docker compose up -d db                         # Postgres: ase_dev, ase_test, ase_shadow
pnpm --filter @ase/contracts gen                # sinh kiểu TS từ OpenAPI
pnpm --filter @ase/api prisma:generate
pnpm --filter @ase/api prisma:deploy            # áp migration baseline + cr02_opening_balance
pnpm --filter @ase/api dev                      # http://localhost:3000/api/v1/health
```
Chạy bản web (cửa sổ khác) — đặt `CORS_ORIGINS=http://localhost:8081` trong `apps/api/.env` trước khi chạy API:
```bash
cd apps/mobile && EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1 npx expo start --web
```
Bản web tĩnh để deploy: `cd apps/mobile && EXPO_PUBLIC_API_URL=<URL API>/api/v1 npx expo export --platform web --output-dir dist`.

**AI Scan:** `AI_PROVIDER=claude` + `AI_API_KEY` (chỉ đặt ở backend) + `AI_MODEL_SCAN` (mặc định `claude-opus-5-5`). Với `AI_PROVIDER=fake`, mọi ảnh hợp lệ trả về cùng một hóa đơn mẫu tên “Cửa hàng mẫu (AI giả lập)” — chỉ để chạy thử, production bị chặn dùng chế độ này.

## Kiểm thử
| Lệnh | Nội dung | Kết quả lần chạy gần nhất (cục bộ) |
|---|---|---|
| `pnpm contract:check` | 45 endpoint (API v1.1 + CR-02): 19 `x-mvp: core` (15 cần Bearer), 26 `deferred`; Redocly; fixtures | xanh |
| `pnpm lint` · `pnpm typecheck` | ESLint (gồm ranh giới Rule/Store/Container/Presentational) · TypeScript | xanh |
| `pnpm test` | Unit BE 95 (MONEY, DATE, IDEM, HASH, OPEN-VALUE, BAL, DRAFT, RECON, đầu ra AI…) + FE 51 (rules, session, http, LoginContainer, AddExpenseContainer, ScanContainer…) | 95/95 · 51/51 |
| `pnpm test:int` | Integration trên PostgreSQL thật: AUTH, AUTH-REFRESH, USER, ENVELOPE, SCHEMA, CONTRACT, OPEN-BAL, BAL-GUARD, CONC-BAL, TX, IDEM, DASH, SCAN, SCAN-IDEM, SCAN-FAIL, PRIV, AI-ADV, SCAN-CONFIRM, DRAFT-AUTHZ | 99/99 |
| `pnpm --filter @ase/api test:sql` | IT-SCHEMA bản SQL thuần | xanh |
| `pnpm --filter @ase/api prisma:drift` | migration == schema.prisma | “No difference detected” |
| `WEB_URL=… API_URL=… node e2e/web/mvp.e2e.cjs` | Playwright trên Expo Web: E2E-01, 02, 09, 10 (UI), 13. Cần `playwright` + Chromium có sẵn (chưa khai báo trong package.json) | 5/5 |
| `maestro test e2e/` | Flow Maestro cho app native — **hoãn** (CR-01 E-03) | — |

Integration cần `DATABASE_URL` trỏ DB có chữ `test` (vd `ase_test`) đã `prisma:deploy`.

## Task đã viết code (Phase 0–1 của Revision 3.2.2 — ánh xạ sang task mới ở `planning-mvp.md` §9)
| Task | Ở đâu |
|---|---|
| P0-SH-01 quyết định | `docs/decisions.md` |
| P0-SH-02 OpenAPI | `packages/contracts/openapi.yaml`, `contract-changelog.md`, `scripts/check-openapi.mjs` |
| P0-TD-01 bootstrap | `package.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `.env.example`, `docs/stack-lock.md` |
| P0-TD-02 harness BE | `apps/api/test/{setup,helpers,fakes}` |
| P0-TD-03 harness FE | `apps/mobile/test/{setup.ts,render.tsx,msw}` |
| P0-TD-04 AI fixtures | `packages/contracts/fixtures/ai/*.json` (16) |
| P0-TD-05 CI | `.github/workflows/ci.yml` (AI_PROVIDER=fake, chặn mạng ra ngoài trong test) |
| P0-TD-06 E2E spike | `e2e/*.yaml` |
| P0-SH-03 / P1-SH-03 gate | `docs/gates/` (nhóm ký) |
| P1-BE-01 schema + migration | `apps/api/prisma/schema.prisma`, `migrations/20261124000000_baseline` |
| P1-BE-02 khung backend | `src/common/{config,errors,interceptors,logging}`, `src/bootstrap.ts` |
| P1-BE-03 Money/ngày/Idempotency | `src/common/{money,dates,idempotency}` |
| P1-BE-04 Auth | `src/modules/auth` |
| P1-BE-05 User | `src/modules/user` |
| P1-BE-06 danh mục mặc định | `src/modules/category` |
| P1-SH-01 authz matrix | `apps/api/test/helpers/authz-matrix.ts` |
| P1-SH-02 contract test | `apps/api/test/helpers/contract.ts`, `contract.int-spec.ts` |
| P1-FE-01 scaffold + ESLint ranh giới kiến trúc | `apps/mobile/eslint.config.js`, `test/eslint/` |
| P1-FE-02 design tokens + primitive | `src/theme`, `src/ui` |
| P1-FE-03 điều hướng | `apps/mobile/app/` (Stack.Protected) |
| P1-FE-04 API client + phiên + remember-me | `src/api/{http,session,client,idempotency}.ts` |
| P1-FE-05 Rule v0 | `src/rules` |
| P1-FE-06 màn Auth | `src/features/auth` |
| P1-TD-01 E2E-01 | `e2e/auth-*.yaml` |

## Mã MVP Revision 4.0 (M0–M2)
| Chức năng | Backend (`apps/api/src`) | Frontend (`apps/mobile/src`) |
|---|---|---|
| Số dư ban đầu + BalanceGuard (CR-02) | `common/balance/*`, `modules/balance/*`, migration `*_cr02_opening_balance` | `features/balance/*`, `rules/balance.ts`, `app/opening-balance.tsx` |
| Khoản chi, danh mục, Dashboard | `modules/transaction/*`, `modules/category/category.controller.ts`, `modules/dashboard/*` | `features/expenses/*`, `features/dashboard/*`, `app/(tabs)/{index,add}.tsx`, `app/history.tsx`, `app/transaction/[id].tsx` |
| AI Scan (tải ảnh, nháp, sửa, xác nhận) | `modules/ai-provider/*` (adapter Claude + fake), `modules/ai-scan/*`, `modules/ai-draft/*` | `features/scan/*`, `rules/receipt.ts`, `api/receiptImage.web.ts`, `app/(tabs)/scan.tsx` |
| Triển khai | `src/serverless.ts`, `api/index.js`, `vercel.json` | `vercel.json` (Expo Web tĩnh) |

Hướng dẫn triển khai, kịch bản trình diễn và giới hạn đã biết: `docs/runbook.md`.

## Quy tắc khi code tiếp (tóm tắt — chi tiết ở `planning-mvp.md` §1.1)
- **Hợp đồng trước:** sửa `openapi.yaml` + `contract-changelog.md` → `pnpm --filter @ase/contracts gen` → BE/FE. Không thêm endpoint/mã lỗi ngoài API v1.1 khi chưa có change request.
- **Tiền** luôn là chuỗi ở API, `bigint` ở BE, không bao giờ `Number`.
- **Mọi thao tác đổi số dư** (tạo khoản chi, xác nhận AI Scan, thiết lập/sửa số dư ban đầu) đi qua `BalanceGuard`: khóa `users ... FOR UPDATE` → tính số dư dự kiến → `< 0` hoặc chưa thiết lập thì `422 INSUFFICIENT_BALANCE` và rollback (D-07, CR-02).
- **Idempotency:** dùng `common/idempotency` + đúng cột ERD (`IDEMPOTENT_OPERATIONS` ghi cột tương ứng).
- **FE:** Presentational chỉ nhận props; Container gọi API + Rule; ESLint sẽ chặn nếu vi phạm.
- **Migration:** do **Prisma Migrate** quản lý (K10b); không sửa migration đã áp dụng; thay đổi = migration mới + `prisma:drift` rỗng. Quy trình baseline/XN-1: `planning-mvp.md` §7.
<!-- Vercel deployment trigger -->
