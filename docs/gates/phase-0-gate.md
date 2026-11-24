# Gate P0-SH-03 — Phase 0 (nhóm ký, Claude không ký)

> **Đã được thay thế (Revision 4.0-MVP, 2026-11-24):** gate này gộp vào `G1.md` (CR-01 E-11). Giữ file để truy vết; không ký file này.

| Hạng mục DoD-P | Bằng chứng | Trạng thái |
|---|---|---|
| Bộ nguồn v1.1 trong repo | `docs/sources/` (4 file, không sửa) | ☐ nhóm xác nhận |
| OpenAPI đủ 44 endpoint, SavingJar = 6, không PATCH/DELETE hũ | `pnpm contract:check` | ☐ |
| Contract delta D-12 ghi changelog | `packages/contracts/contract-changelog.md` | ☐ |
| Repo xanh trên CI (lint → typecheck → unit → integration → contract) | link run GitHub Actions | ☐ |
| `docs/stack-lock.md` điền phiên bản + lockfile commit | `pnpm-lock.yaml` | ☐ |
| Smoke Android (iOS nếu có macOS): chọn ảnh, multipart, secure-store, E2E tối thiểu | ảnh chụp/log | ☐ |
| Harness BE (DB thật, clock cố định, parallel, FakeAIProvider) | `apps/api/test/helpers`, `fakes/` | ☐ |
| Harness FE (MSW, renderWithProviders, clock) | `apps/mobile/test/` | ☐ |
| AI fixtures ≥ đủ loại bắt buộc | `pnpm --filter @ase/contracts test` | ☐ |
| Truy vết 12 FR + 26 AC + 5 NFR | `docs/traceability.csv` (43 dòng) | ☐ |
| D-xx còn mở / rủi ro mới | `docs/decisions.md` | ☐ |

Người ký: ____________________  Ngày: __________
