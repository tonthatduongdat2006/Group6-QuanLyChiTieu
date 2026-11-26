# Gate P1-SH-03 — Phase 1 (nhóm ký)

> **Đã được thay thế (Revision 4.0-MVP, 2026-11-24):** gate này gộp vào `G1.md` (CR-01 E-11). Giữ file để truy vết; không ký file này.

| Hạng mục | Bằng chứng | Trạng thái |
|---|---|---|
| Migration baseline áp dụng được, `prisma:drift` rỗng | CI step "Schema drift" | ☐ |
| IT-SCHEMA xanh (Jest + bản SQL `pnpm --filter @ase/api test:sql`) | log CI | ☐ |
| IT-AUTH, IT-USER, IT-ENVELOPE xanh | log CI | ☐ |
| UT-MONEY/DATE/IDEM/HASH/VALID/REDACT xanh | log CI | ☐ |
| UT-FE-MONEY/VALID/SESSION/HTTP + LoginContainer + ESLint boundaries xanh | log CI | ☐ |
| E2E-01 (đăng ký/đăng nhập/đăng xuất + remember-me) xanh trên dev build | `maestro test e2e/` | ☐ |
| IT-CONTRACT (P1-SH-02): phản hồi BE khớp OpenAPI | `apps/api/test/integration/contract.int-spec.ts` | ☐ |
| Danh sách D-xx còn mở cập nhật (D-14 danh mục mặc định chờ nhóm chốt) | `docs/decisions.md` | ☐ |

Người ký: ____________________  Ngày: __________
