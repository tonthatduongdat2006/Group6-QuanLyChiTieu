# Stack lock (M0-01 / D-03)

> **Trạng thái: ĐÃ TẠO LOCKFILE, CHƯA COMMIT.** Phiên bản dưới đây là bản thực tế trong `pnpm-lock.yaml` (lockfileVersion 9.0),
> kiểm ngày 2026-11-24 trong môi trường Linux của Claude Code (container, có mạng tới npm registry).
> Nhóm tự commit `pnpm-lock.yaml` + file này (M0-01). Không tự nâng major khi chưa chạy lại smoke test.

| Thành phần | Range trong repo | Phiên bản đã khóa | Smoke test (môi trường Claude, 2026-11-24) |
|---|---|---|---|
| Node | 22 LTS (`engines >=22 <23`) | 22.23.5 | ☑ dùng cho mọi lệnh dưới đây |
| pnpm | `packageManager: pnpm@10.18.0` | 10.18.0 (qua corepack) | ☑ `pnpm install`; xóa `node_modules` rồi `pnpm install --frozen-lockfile` thành công |
| NestJS | ^11 | @nestjs/core 11.2.11 | ☑ `nest build`; `node dist/main.js` → `GET /api/v1/health` 200 |
| Prisma | ^6.19 | prisma / @prisma/client 6.19.3 | ☑ `prisma validate`; `migrate deploy` + `migrate diff --exit-code` rỗng (PostgreSQL 16 cục bộ, DB test) |
| PostgreSQL | 16 (local) / Supabase | 16.15 (cục bộ) | ☑ local · ☐ Supabase pooler + direct (spike M0-05) |
| Expo SDK | ~54 | expo 54.0.38 | ☑ `npx expo install --check` "Dependencies are up to date" (**chế độ offline**, dùng `bundledNativeModules.json`) · ☑ `expo export --platform web` · ☐ `npx expo-doctor` (chưa chạy: cần tải gói, chờ cho phép) |
| React / React Native | theo Expo SDK | react 19.1.0 · react-native 0.81.5 | ☑ jest-expo unit test · ☐ dev build Android/iOS (hoãn: MVP phát hành Expo Web, CR-01 E-01) |
| Expo Web | theo Expo SDK | react-dom 19.1.0 · react-native-web 0.21.4 · @expo/metro-runtime ~6.1.2 | ☑ `expo export --platform web` (bundle 1.64 MB) |
| expo-router | ~6.0 | 6.0.24 | ☑ export web |
| TanStack Query | ^5 | 5.108.4 | ☑ unit test FE |
| Zustand | ^5 | 5.1.0 | ☑ unit test FE |
| TypeScript | ~5.9 | 5.9.3 | ☑ typecheck API, mobile, contracts |
| E2E | Playwright (CR-01 E-03) | _chưa khai báo trong package.json_ | ☑ `e2e/web/mvp.e2e.cjs` chạy bằng Playwright có sẵn trong môi trường (5/5) · ☐ khai báo dependency + chạy trong CI (chờ cho phép thêm gói) |
| Maestro | CLI | — | Hoãn (CR-01 E-03) |

**Thay đổi dependency ở M0-01 (theo `npx expo install`, không nâng major):** `react-native` 0.81.4 → 0.81.5 (Expo SDK 54 yêu cầu);
thêm `react-dom`, `react-native-web`, `@expo/metro-runtime` cho Expo Web (CR-01 E-01) — thiếu các gói này thì `expo export --platform web` không chạy.

## Các bước khóa phiên bản
```bash
corepack enable
pnpm install                          # tạo pnpm-lock.yaml
cd apps/mobile && npx expo install --check && npx expo-doctor && cd ../..
pnpm --filter @ase/contracts gen      # sinh kiểu từ OpenAPI
pnpm --filter @ase/api prisma:generate
docker compose up -d db
pnpm --filter @ase/api prisma:deploy
pnpm --filter @ase/api prisma:drift   # phải ra "No difference detected"
pnpm lint && pnpm typecheck && pnpm test && pnpm test:int
cd apps/api && npx nest build && cd ../mobile && npx expo export --platform web
```
