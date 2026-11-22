# Stack Lock – AI Smart Expense

Status: P0-TD-01 – In progress (PARTIAL)
Last verified: 2026-11-21
Planning baseline: Revision 3.2.2 GROUP APPROVED (see `docs/decisions.md`)

Evidence sources used below:
- **[L]** — recorded in the first version of this file (local runs on the Windows workstation).
- **[U-2026-11-21]** — local results reported by the project coordinator on 2026-11-21; command output not attached to the repository.
- **[R]** — reproduced in the review environment from the repository files (no `node_modules`, no network).

## 1. Environment

| Component | Version | Status |
|---|---|---|
| Node.js | 22.22.3 | Verified |
| pnpm | 9.15.9 | Verified |
| Java | 17 | Installed |
| Android SDK | D:\Android\Sdk | Configured |
| Operating System | Windows 11 | Verified |

## 2. Backend

| Component | Resolved version | Status |
|---|---|---|
| NestJS | 10.4.22 | Build passed |
| TypeScript | 5.9.3 | Typecheck passed |
| Jest | 29.7.0 | Default scaffold test passed |
| ESLint | 8.57.1 | Backend lint passed [U-2026-11-21] |
| Prettier | 3.10.1 | Backend format check passed [U-2026-11-21] |
| Express (runtime) | 4.22.1 | Resolved via `@nestjs/platform-express` 10.4.22 [R: lockfile] |
| @types/express | 4.17.25 | Aligned with Express 4.22.1 runtime; API typecheck and build passed [U-2026-11-22] |
| Prisma / @prisma/client | 6.19.3 | Schema datasource-only validated; Supabase Session Pooler smoke passed [U-2026-11-21] |
| PostgreSQL (dev) | Supabase PostgreSQL 17.12 | Connection verified via Session Pooler, port 5432; `db:smoke` passed [U-2026-11-21] |
| PostgreSQL (local/test) | No local installation | Not installed by coordinator decision; Supabase remains the online development database. Test database isolation strategy remains pending for P0-TD-02. |

`apps/api/.env.example` contains placeholder `DATABASE_URL` for Supabase Session Pooler and `CHECKPOINT_DISABLE=1` [U-2026-11-21].

Prisma datasource-only setup [U-2026-11-21]:
- Schema: `apps/api/prisma/schema.prisma` contains only `generator` and `datasource`; no models, enums, or migrations.
- Connection: Supabase PostgreSQL via Session Pooler (port 5432), using `DATABASE_URL` from `apps/api/.env`.
- `pnpm --filter api prisma:validate` → passed.
- `pnpm --filter api db:smoke` → `Script executed successfully.`
- `pnpm --filter api build` → passed.
- `apps/api/.env` is Git-ignored; no Prisma migrations directory exists.

## 3. Mobile

| Component | Resolved version | Status |
|---|---|---|
| Expo | 58.0.26 | Expo dependency check passed |
| Expo Dev Client | 58.0.21 | Installed |
| React | 19.3.0 | Installed |
| React Native | 0.88.1 | Android JS export passed |
| TypeScript | 6.0.3 | Typecheck passed |
| Android Gradle configuration | – | `.\gradlew.bat help` → BUILD SUCCESSFUL [U-2026-11-21] |
| Android Debug APK | – | `.\gradlew.bat :app:assembleDebug` → BUILD SUCCESSFUL; `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`, 167.68 MB [U-2026-11-21] |
| Android device smoke test | – | **BLOCKED** – `adb devices` shows no device [U-2026-11-21] |

Note: `apps/mobile/android/gradle.properties` was edited by hand (`android.cmakeVersion=3.31.6`, Windows long-path workaround) while `apps/mobile/.gitignore` ignores `/android`. The setting is not version-controlled and will be lost on `expo prebuild --clean`.

## 4. Contracts

| Component | Resolved version | Status |
|---|---|---|
| TypeScript | 6.0.3 | Typecheck passed |
| OpenAPI | 3.1.0 | Structural validation passed: 15 checks passed, 0 failed [U-2026-11-21]; reproduced 15/15 with `API_DOC_PATH` set to API v1.1 [R] |
| OpenAPI operations | 44 | Matched API Documentation v1.1 [U-2026-11-21][R] |
| OpenAPI lint | – | **Pending** – no linter installed; `@redocly/cli` approved (Q3) |

Note: `packages/contracts/validate.sh` defaults to `docs/05_API_Documentation_v1.1.md`; the source document now lives at `docs/sources/05_API_Documentation_v1.1.md`. Without `API_DOC_PATH` the count-match check is skipped. To be fixed in P0-SH-02.

## 5. Pending Compatibility Verification

- Full Prisma ORM compatibility with application models and migrations (P1-BE-01); current verification covers datasource-only schema and connectivity.
- Local/test PostgreSQL: no local installation by coordinator decision; define an appropriate isolated test database strategy for P0-TD-02.
- Prisma 6.19.3 against PostgreSQL and NestJS 10 / TypeScript 5.9.3.
- Express type compatibility: `@types/express` 4.17.25 aligned with Express 4.22.1; API typecheck and build passed [U-2026-11-22].
- OpenAPI lint.
- Android device smoke test (image picker, multipart upload, secure store) – blocked: no device.
- Lint and format for `apps/mobile` and `packages/contracts` remain pending. Husky 9.1.7 pre-commit hook runs workspace TypeScript checks successfully [U-2026-11-22].
- CI version guard.
- Test harness (P0-TD-02, P0-TD-03).
- pnpm user configuration is stored at `D:\pnpm-config\pnpm-user.npmrc`; virtual store is on drive D:. CI/Linux runner configuration still needs verification.

## 6. Important Notes

- Resolved versions are recorded from the current pnpm installation and lockfile.
- Do not upgrade major versions without compatibility verification.
- Do not claim full stack compatibility until pending checks pass.
- Keep project dependencies and local caches on drive D: where possible.
- Do not install or download project components to drive C: without explicit user approval.
