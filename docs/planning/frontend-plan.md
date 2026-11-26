# Frontend Implementation Plan (React Native + Expo + TypeScript)
> **Thuật ngữ (Revision 4.0-MVP, S12):** trong file này (bản Revision 3.2.2), chữ "ECC" được dùng để chỉ kiến trúc frontend Rule/Store/Container/Presentational. Từ Revision 4.0, **ECC = Everything Claude Code** (bộ công cụ riêng cho Claude Code trong quy trình của giảng viên); kiến trúc ứng dụng gọi bằng tên đầy đủ **Rule/Store/Container/Presentational** (Solution Architecture v1.1 §5). Xem `planning-mvp.md` §0.
> **Revision 4.0-MVP (2026-11-24) — ngoại lệ áp dụng cho MVP:** nền tảng phát hành là Expo Web (CR-01 E-01); "Ghi nhớ đăng nhập" bị ẩn trên web (E-04); E2E bằng Playwright (E-03); thêm màn thiết lập số dư ban đầu và 2 thông báo CR-02; dòng "số dư ban đầu 0 → người dùng mới cần có thu nhập trước" (§3) bị thay thế bởi CR-02; màn ngoài MVP (ngân sách, hũ, thống kê, danh mục, Chat) hoãn. Kiến trúc Rule/Store/Container/Presentational giữ nguyên.
**Nguồn:** (1) Prototype · (2) PRD · (3) Architecture · (5) API. **Trạng thái:** Revision 3.2.2 (2026-11-20) – kế hoạch đã được nhóm phê duyệt; GROUP APPROVED. Không tạo mã.
> **Nguồn đã đối chiếu trực tiếp trong Revision 3.2.2:** bốn tài liệu v1.1 (PRD, Solution Architecture, ERD, API); bằng chứng theo document/section ở `review-plan-report.md` §9. PRD v1.1 là Approved business baseline; prototype chỉ là tham chiếu UI. REQ-X1…X5 không phải yêu cầu bắt buộc của PRD v1.1 và tiếp tục nằm ngoài phạm vi/đề xuất tùy chọn D-21…D-24.


Cấu hình thư viện ở §10 là **khuyến nghị kỹ thuật chờ nhóm duyệt (D-16)**, đã tra cứu ngày 2026-11-12, **chưa cài thử**, phải xác minh lại + khóa lockfile khi dựng (D-03). **RV-xx** = yêu cầu sửa của lượt review Revision 2.

## 1. Nguyên tắc

**Ranh giới triển khai:** mobile app React Native + Expo là ứng dụng Android/iOS; backend NestJS được host trên Vercel và kết nối Supabase PostgreSQL qua API. Không nhúng Supabase service-role key, database password hoặc Claude API key vào mobile bundle; không dùng Supabase Auth (xác thực do NestJS đảm nhiệm).
- **PRD là nguồn nghiệp vụ chuẩn; prototype chỉ là tham chiếu giao diện, bố cục và tương tác** (sai khác ở `review-plan-report.md` §2). Chức năng PRD mà prototype không có (xem/sửa/xóa giao dịch, chat nhiều lượt, quét hóa đơn có món hàng, hội thoại đã lưu…) **được thiết kế mới theo PRD, không bỏ chức năng**. D-01 **không chặn** kế hoạch: nếu nhóm không cung cấp prototype mới hơn thì tiếp tục dùng file hiện tại làm tham chiếu giao diện.
- Client chỉ nói chuyện với REST backend; **không gọi AI trực tiếp**, không chứa khóa AI.
- Server là nguồn sự thật cho số dư, thống kê, ngân sách, trạng thái draft. Client chỉ validate để hỗ trợ UX.
- Tiền luôn là **chuỗi số nguyên VND** ở biên API; tính toán client dùng BigInt/chuỗi, không dùng `Number` cho số lớn.

## 2. Kiến trúc ECC: Rule + Store + Container + Presentational
```
apps/mobile/src/
  rules/        # TS thuần: không import React/RN/api/stores
  stores/       # Zustand (ứng viên): state client thuần
  api/          # client sinh từ OpenAPI, query keys, hooks server-state, ánh xạ lỗi
  features/<f>/ # f = auth, dashboard, transactions, history, budgets, jars, stats, categories, ai, profile
    containers/ #   màn hình + custom hooks: gọi api, rules, store; truyền props xuống
    components/ #   Presentational: chỉ props + sự kiện
  ui/           # primitive Presentational dùng chung (Button, Field, Sheet…)
  theme/ navigation/ utils/format (hiển thị thuần)
```
| Lớp | Được làm | Không được làm | Kiểm tra |
|---|---|---|---|
| **Rule** | validate số tiền/email/ngày, trạng thái ngân sách, `isDraftConfirmable`, đối soát tổng hóa đơn, parse/format VND | import UI/api/store; truy cập mạng/lưu trữ | Unit test độc lập; ESLint cấm import |
| **Store** | bộ lọc lịch sử, editor draft đang sửa, UI phiên (đã đăng nhập?) | chép lại dữ liệu server (giao dịch, số dư…) | Review + test selector |
| **Container** | gọi hook server-state, áp Rule, điều phối loading/error/callback, điều hướng | tự vẽ UI phức tạp, chứa công thức nghiệp vụ | RNTL + MSW |
| **Presentational** | render từ props, phát sự kiện | gọi API, đọc store, chứa Rule/validate nghiệp vụ | ESLint cấm import `api/`, `stores/`, `rules/`; snapshot |
*Hiển thị định dạng* (vd. `formatVnd`) nằm ở `utils/format` và được phép dùng trong Presentational; **validate/nghiệp vụ thì không**.

**Danh mục Rule (unit test bắt buộc):** `parseMoney`, `formatVnd`, `validateAmount`, `validateEmail/Password/Terms`, `validateTransactionForm`, `budgetStatus` (ok/80%/vượt, số nguyên), `canDepositHint`, `isDraftConfirmable`, `receiptSum`, `receiptMatches`, `validateItem`.

## 3. Màn hình & điều hướng
Cơ sở: prototype (tab dưới *Trang chủ · Thống kê · (+) · Ngân sách · Cá nhân*). Màn hình **mới theo PRD, không có trong prototype** được đánh dấu ⊕.
| Khu vực | Màn hình/Container | Presentational chính | Ghi chú |
|---|---|---|---|
| Auth | Đăng ký, Đăng nhập | AuthForm, PasswordField, TermsCheck | Bỏ nút demo, "Quên mật khẩu" (OQ-02) và đăng nhập Google/Facebook (ngoài phạm vi v1); "ghi nhớ đăng nhập" theo D-13a (§5) |
| Home | DashboardScreen | BalanceHero, QuickActions, AiBanner, BudgetAlertList, RecentList | Banner AI bật ở Phase 3 |
| Thêm giao dịch | AddTransactionScreen | TypeSegment, AmountInput, CategoryGrid, DatePicker, SuccessView, BalanceErrorBanner | Idempotency-Key theo ý định; **chi tiêu vượt số dư khả dụng bị chặn** (số dư ban đầu 0 → người dùng mới cần có thu nhập trước) |
| Lịch sử | HistoryScreen ⊕ TransactionDetail/Edit/Delete ⊕ ReceiptItemsEditor | MonthSwitcher, TypeChips, DayGroup, TxRow | Prototype chỉ có danh sách + lọc. Giao dịch hóa đơn: tổng tiền **chỉ đọc**, sửa qua trình sửa món hàng (một PATCH nguyên tử) |
| Ngân sách | BudgetScreen | BudgetSummary, BudgetCard, BudgetFormSheet | Quy tắc tháng: D-08 |
| Hũ | JarsScreen, JarDetailSheet, JarCreateSheet | JarCard, TransferForm, JarHistoryList ⊕ | Lịch sử phân trang (prototype chỉ 5 dòng); biểu tượng hũ (prototype có) chỉ ánh xạ phía client nếu nhóm muốn — server không lưu `icon_key`/`target_date` trong baseline (D-23 tùy chọn) |
| Thống kê | StatsScreen | Tabs, DailyBarChart (chỉ chi tiêu), CategoryBreakdown | **D-10 đã chốt theo PRD v1.1:** biểu đồ chi tiêu 7 ngày; Tổng quan tập trung chi tiêu; tab Thu nhập chỉ có tổng thu nhập tháng + theo danh mục; không biểu đồ thu nhập 7 ngày, không bộ chọn tuần/tháng (prototype có biểu đồ thu nhập — **không mang sang**) |
| Danh mục | CategoriesScreen | CategoryRow, CategoryCreateSheet | Không đổi tên, **không xóa** (PRD v1.1/API v1.1); số giao dịch + tổng tháng của prototype chỉ hiển thị nếu API v1.1 cung cấp (D-24 tùy chọn) |
| Cá nhân | ProfileScreen | MenuList, ProfileForm ⊕ | PATCH `/users/me` |
| AI | AiHub → Chat, Scan | MessageBubble, DraftCard, DraftList, ConfirmAllBar ⊕, ConversationList ⊕, ReceiptDraftEditor ⊕, ItemRow ⊕, TotalMismatchBanner ⊕ | Chi tiết §7 |

## 4. Form & validation (Rule ↔ lỗi server)
Client validate trước để phản hồi nhanh, **server vẫn quyết định**; mọi mã lỗi server hiển thị bằng thông báo tiếng Việt.
| Tình huống | Rule client | Lỗi server |
|---|---|---|
| Số tiền ≤ 0 / không phải số | `validateAmount` | `VALIDATION_ERROR` (field `amount`) |
| Thiếu danh mục / sai loại | `validateTransactionForm` | `VALIDATION_ERROR` |
| Chi tiêu/sửa/xóa/xác nhận bị từ chối vì làm số dư khả dụng âm; nạp vượt số dư khả dụng | `canApplyHint` (chỉ gợi ý, server quyết định) | `INSUFFICIENT_BALANCE` |
| Rút vượt số dư hũ | `canWithdrawHint` | `INSUFFICIENT_JAR_BALANCE` |
| Tổng item ≠ tổng hóa đơn | `receiptMatches` | `RECEIPT_TOTAL_MISMATCH` |
| Confirm-all có draft lỗi | `isDraftConfirmable` từng draft | `BATCH_INVALID` (chi tiết từng draft) |
| Email trùng | – | `CONFLICT` |
| Quá tải AI / lỗi provider | – | `RATE_LIMITED` / `AI_PROVIDER_ERROR` |

## 5. API client, phiên, idempotency
- **Client sinh từ OpenAPI** (P0-SH-02) → không viết tay DTO; CI fail khi lệch (P1-SH-02).
- **Bearer + refresh single-flight:** nhiều request cùng 401 chỉ gọi refresh một lần, các request chờ rồi thử lại; refresh thất bại → xóa phiên, về màn Đăng nhập.
- **Remember-me (RV-06, D-13a):** **bật** → refresh token lưu trong kho bảo mật của OS (Keychain/Keystore); khi mở app: đọc refresh token → `POST /auth/refresh` → `GET /users/me` → vào app; thất bại → màn Đăng nhập. **Tắt** → chỉ giữ phiên trong bộ nhớ, mở lại app phải đăng nhập. Access token **không bao giờ** lưu bền. Đăng xuất hoặc refresh bị từ chối → xóa cả hai. Cờ này thuộc client; API không cần thêm trường.
- **Idempotency-Key:** UUID sinh khi người dùng mở form tạo / hộp thoại xác nhận / bấm gửi tin mới / chọn ảnh / bấm xác nhận draft hoặc xác nhận tất cả; **dùng lại cho mọi lần thử lại cùng ý định** (timeout, mất mạng, 5xx, 401 → refresh → thử lại); **sinh mới** sau khi thành công hoặc khi người dùng đổi nội dung (R-24). Theo hợp đồng hiện có (API v1.1 §1.1, đã đối chiếu trực tiếp) key áp dụng cho: tạo giao dịch, tạo hũ, nạp, rút, gửi tin nhắn AI, quét hóa đơn (key gắn với **một lần chọn ảnh**), **xác nhận draft và confirm-all**. Cùng key + nội dung khác → `409 IDEMPOTENCY_KEY_REUSED` → coi là lỗi lập trình, sinh key mới và báo người dùng thử lại. Quét hóa đơn: hủy trước commit → server không tạo gì, retry chạy lại; mất phản hồi sau commit → retry cùng key + cùng ảnh trả đúng draft cũ. Xác nhận bị `INSUFFICIENT_BALANCE` → không lưu gì; có thể thử lại cùng key sau khi có thêm thu nhập. Nếu app bị đóng giữa chừng, tải lại dữ liệu từ server trước khi cho gửi lại.
- **Ngày/múi giờ:** "hôm nay"/tháng hiện tại theo `Asia/Ho_Chi_Minh`; ngày gửi `YYYY-MM-DD`.
- **Tiền:** nhập có dấu chấm ngăn cách, gửi chuỗi số nguyên; định dạng hiển thị `vi-VN`.

## 6. Server state vs client state
| Loại | Ví dụ | Nơi giữ |
|---|---|---|
| Server state | dashboard, danh sách giao dịch, ngân sách, hũ, thống kê, hội thoại, draft | Hook server-state (TanStack Query — ứng viên) |
| Client state | tháng/bộ lọc lịch sử, nội dung đang sửa trong draft, trạng thái phiên UI | Store nhỏ (Zustand — ứng viên) hoặc state cục bộ |

**Ma trận invalidate sau mutation** (chỉ chạy sau khi server báo thành công):
| Mutation | Làm mới |
|---|---|
| Tạo/sửa/xóa giao dịch; xác nhận draft/confirm-all/scan | dashboard, lịch sử, thống kê (overview/categories/daily), ngân sách, (chi tiết giao dịch) |
| Sửa món hàng + tổng của giao dịch hóa đơn | chi tiết giao dịch, lịch sử, dashboard, thống kê, ngân sách |
| Nạp/rút/tạo hũ | dashboard (số dư), danh sách hũ, chi tiết + lịch sử hũ |
| Tạo/sửa/xóa ngân sách | ngân sách, dashboard (cảnh báo) |
| Tạo danh mục | danh mục |
| Xóa hội thoại | danh sách hội thoại (số liệu tài chính **không** làm mới vì không đổi) |

## 7. Giao diện AI
**Chat:** tạo hội thoại → gửi tin → hiển thị tin nhắn + các draft của lô; trạng thái *đang phân tích*, lỗi, thử lại; khi AI hỏi lại (mơ hồ) chỉ hiện tin nhắn, không đổi draft. Mỗi **DraftCard**: sửa loại/số tiền/danh mục/ngày/ghi chú, **Hủy**, **Xác nhận**; thanh **Xác nhận tất cả** cho lô; nếu `BATCH_INVALID` → đánh dấu draft thiếu/sai, không có gì được lưu, draft hợp lệ vẫn xác nhận lẻ được. **Lưu hội thoại** (tùy chọn) / danh sách đã lưu / mở lại khôi phục draft chờ (không tự lưu) / xóa có xác nhận (nêu rõ giao dịch đã xác nhận vẫn còn).
**Scan:** chọn ảnh từ thư viện (không camera), xem trước, upload (có thể hủy bằng AbortController — server không tạo draft khi bị hủy), rồi **ReceiptDraftEditor**: merchant/ngày/tổng, danh sách item (thêm/sửa/xóa; ô không đọc được được đánh dấu), **tự chọn danh mục**, banner lệch tổng; nút xác nhận chỉ bật khi đủ dữ liệu và tổng khớp. Sau khi upload xong/hủy/lỗi, **xóa bản sao ảnh trong cache ứng dụng** và bỏ tham chiếu ảnh khỏi state (NFR-PRI). **Sửa hóa đơn đã xác nhận:** từ chi tiết giao dịch mở lại ReceiptItemsEditor (cùng thành phần), gửi **một** PATCH gồm danh sách món + tổng; `RECEIPT_TOTAL_MISMATCH` hiển thị tại banner lệch tổng.
**Trạng thái chuẩn:** loading / empty / error (có nút thử lại) / bị giới hạn (`RATE_LIMITED`) / AI lỗi (`AI_PROVIDER_ERROR` → gợi ý nhập tay).

## 8. Bảng quyết định đối với prototype
| Mục prototype | Quyết định | Lý do |
|---|---|---|
| Điều hướng, bố cục Home, màu, chuỗi tiếng Việt, thông báo lỗi | **Dùng lại** | Tham chiếu giao diện chính thức |
| Màn thêm giao dịch, ngân sách, danh mục | **Dùng lại + điều chỉnh** (D-08, G-14) | Khớp PRD, thêm tháng/idempotency |
| Hũ: nạp/rút | **Sửa** theo FR-09 (số dư khả dụng) | P-02 |
| Số dư Home = thu − chi | **Sửa** theo FR-03 | P-01 |
| Lịch sử chỉ danh sách | **Mở rộng** (chi tiết/sửa/xóa) | FR-07, P-03 |
| AI Chat đơn lượt, AI Scan chỉ tổng+danh mục | **Thiết kế lại** | P-04, P-05 |
| `localStorage`, mật khẩu plaintext, nút demo, gọi AI từ client | **Bỏ** | P-10, P-12 |

## 9. Bản đồ tích hợp (màn hình → endpoint → DTO)
| Màn hình / use case | Endpoint | Trường chính (kiểu) | Lưu ý hợp đồng |
|---|---|---|---|
| Đăng ký | `POST /auth/register` | full_name, email, password, phone?, terms_accepted | 201; trùng email → 409 |
| Đăng nhập/Refresh/Đăng xuất | `POST /auth/login`, `/refresh`, `/logout` | access_token, refresh_token, expires_in | expires_in = 900 chỉ là đề xuất (cấu hình được) |
| Cá nhân | `GET/PATCH /users/me` | full_name, phone | – |
| Home | `GET /dashboard?month=` | available_balance (chuỗi), monthly_income/expense, recent_transactions[], budget_alerts[] | **G-04** thiếu shape `recent_transactions`, `budget_alerts` |
| Danh mục | `GET/POST /categories` | id, name, type, is_default | Không xóa/đổi tên; icon/màu ánh xạ phía client |
| Thêm giao dịch | `POST /transactions` + `Idempotency-Key` (bắt buộc) | type, amount (chuỗi), category_id, note, transaction_date | source do server đặt; `422 INSUFFICIENT_BALANCE` khi chi tiêu vượt số dư |
| Lịch sử | `GET /transactions?month&type&page&page_size` | items + meta | Sắp xếp chưa quy định (**G-05**) |
| Chi tiết/Sửa/Xóa | `GET/PATCH/DELETE /transactions/{transactionId}` | amount, category_id, note, transaction_date; **giao dịch hóa đơn:** `receipt{merchant_name, items[]}` + `amount` cùng lúc | `receipt.items` là full replacement; mỗi item gồm `item_name`, `amount`, `sort_order`; khi đổi amount hóa đơn phải gửi items cùng request; sai tổng → 422 `RECEIPT_TOTAL_MISMATCH`, rollback; projected balance âm → 422 `INSUFFICIENT_BALANCE` |
| Ngân sách | `GET/POST/PATCH/DELETE /budgets` | category_id, month_start, limit_amount, spent_amount, remaining_amount, usage_percent | Trùng → 409 (UI chuyển sang sửa) |
| Hũ | `GET/POST /saving-jars`; `GET /saving-jars/{jarId}`; `POST …/deposits`, `…/withdrawals`; `GET …/transactions` | name, target_amount, initial_deposit?, current_balance, progress_percent | `PATCH` không triển khai (D-11); không có xóa hũ |
| Thống kê | `GET /statistics/overview`, `/categories`, `/daily-expenses` | total_income/expense, net_change; `{date, amount}` | Chỉ daily **expenses** (D-10 theo PRD v1.1) |
| Chat | `POST /ai/conversations`; `POST …/{conversationId}/messages` + `Idempotency-Key`; `GET` list/detail/messages/draft-batches; `PATCH`, `DELETE` | content; draft_batch{drafts[]} | **G-03** thiếu shape sửa-draft/hỏi-lại (đề xuất ở D-18) |
| Draft | `GET/PATCH /ai/drafts/{draftId}`; `POST …/cancel`, `…/confirm`; `POST /ai/draft-batches/{batchId}/confirm-all` (cả hai kèm `Idempotency-Key`) | transaction_type, amount, category_id, transaction_date, note, status, validation_errors; `422 INSUFFICIENT_BALANCE` khi xác nhận làm số dư âm | `422 BATCH_INVALID` kèm lý do từng draft |
| Quét hóa đơn | `POST /ai/receipts/scan` (multipart `image`) + `Idempotency-Key` | draft + items[] | Error upload phải ánh xạ theo API v1.1 §12; `PAYLOAD_TOO_LARGE` và `UNSUPPORTED_MEDIA_TYPE` chưa thuộc contract, chỉ là đề xuất D-15; hủy request ⇒ không có draft; ảnh khác cùng key ⇒ 409 |
| Item hóa đơn | `POST /ai/drafts/{draftId}/items`; `PATCH/DELETE /ai/draft-items/{itemId}` | item_name, amount | Mọi chỉnh sửa → validate lại |
**Phải kiểm tra trước khi viết mã:** kiểu tiền (chuỗi), định dạng ngày/giờ, mã lỗi, luồng refresh, multipart upload, phân trang (`page`, `page_size`, `meta`), idempotency — thực hiện ở P0-SH-02, P1-SH-02, P2-SH-01, P3-SH-01.

## 10. Cấu hình khuyến nghị (đề xuất bootstrap; Architecture v1.1 chưa phê duyệt patch versions)
| Hạng mục | Khuyến nghị | Ghi chú |
|---|---|---|
| Nền tảng | React Native + Expo + TypeScript theo Architecture v1.1; chọn SDK/patch stable tương thích tại bootstrap | Exact SDK/patch versions, Xcode/Android toolchain và package versions resolve khi bootstrap/release; smoke test Android/iOS, ghi lockfile; không tự nâng major |
| Smoke test trước khi chốt | tạo app, `cài phiên bản Expo SDK đã chọn sau compatibility check`, `npx expo-doctor@latest`, `expo install --check`; jest-expo + RNTL + MSW; dev build Android (iOS nếu có macOS); chọn ảnh + upload multipart + xóa cache ảnh; secure-store; Maestro flow tối thiểu | Kết quả ghi `docs/stack-lock.md`; không tự nâng major |
| Điều hướng | Expo Router (mặc định của template Expo) | Chưa tra cứu riêng; React Navigation là thay thế |
| Server-state | **TanStack Query v5** | Có tài liệu React Native; cần React 18+ |
| Client store | Zustand | Chưa tra cứu phiên bản riêng |
| Biểu đồ | `react-native-svg` tối giản | Tránh thư viện biểu đồ nặng |
| Ảnh / kho bảo mật | `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-secure-store` | Gói trong Expo SDK; **chưa kiểm chứng** việc ảnh HEIC trên iOS được xuất ra JPEG |
| Test | Jest + `jest-expo` + RNTL + MSW; E2E **Maestro** (Android emulator/iOS simulator; Expo có hướng dẫn qua EAS Workflows) | – |
Không bắt nhóm chọn từng thư viện: chỉ cần **chấp nhận cấu hình này** hoặc nêu thay đổi. ECC không phụ thuộc thư viện cụ thể.
