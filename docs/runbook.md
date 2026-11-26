# Runbook — AI Smart Expense MVP (M3-03)

Tài liệu vận hành và trình diễn cho bản MVP (Planning 4.0-MVP). Không có tài khoản demo: người xem tự đăng ký (CR-01 §3).

## 1. Thành phần
| Thành phần | Công nghệ | Nơi chạy dự kiến |
|---|---|---|
| Web app | Expo (React Native Web), bản tĩnh từ `expo export --platform web` | Vercel (project gốc `apps/mobile`) |
| API | NestJS 11 + Prisma 6, REST `/api/v1` | Vercel Node function (project gốc `apps/api`, entry `api/index.js` → `dist/serverless.js`) |
| CSDL | PostgreSQL 16 | Supabase (không dùng Supabase Auth) |
| AI Scan | Claude Messages API (vision), gọi từ backend | Khóa chỉ nằm trong biến môi trường của API |

Nền tảng Vercel/Supabase là lựa chọn đã ghi ở D-04b; **spike M0-05 chưa chạy**, nên cấu hình dưới đây chưa được kiểm chứng trên nền tảng thật.

## 2. Biến môi trường (chỉ tên — không ghi giá trị vào repo)
**API (`apps/api`):** `NODE_ENV=production`, `DATABASE_URL` (Supabase pooler, `?pgbouncer=true`), `DIRECT_URL` (kết nối trực tiếp, cho migrate), `JWT_ACCESS_SECRET` (≥ 32 ký tự ngẫu nhiên), `AI_PROVIDER=claude`, `AI_API_KEY`, `AI_MODEL_SCAN` (mặc định `claude-opus-5-5`), `AI_TIMEOUT_MS` (mặc định 60000), `CORS_ORIGINS` (= URL web, vd `https://<web>.vercel.app`), tùy chọn `RECEIPT_MAX_BYTES` (4194304), `SCAN_LIMIT_PER_HOUR` (20), `THROTTLE_LIMIT`.
Production **từ chối khởi động** nếu `AI_PROVIDER` khác `claude` hoặc thiếu `AI_API_KEY`.

**Web (`apps/mobile`):** `EXPO_PUBLIC_API_URL=https://<api>.vercel.app/api/v1` (đặt lúc build; biến `EXPO_PUBLIC_*` nằm trong bundle nên tuyệt đối không đặt secret ở đây).

## 3. Triển khai
1. **Database (Supabase):** tạo project; lấy chuỗi pooler và chuỗi trực tiếp.
2. **Kiểm tra trạng thái migration trước** (XN-1, nghiệm thu mục 1):
   `psql "$DIRECT_URL" -c "SELECT migration_name, checksum, finished_at FROM _prisma_migrations ORDER BY started_at"` (bảng chưa tồn tại = DB mới).
3. **Áp migration:** `DATABASE_URL=$DIRECT_URL DIRECT_URL=$DIRECT_URL pnpm --filter @ase/api prisma:deploy`. Không chạy `migrate dev`/`migrate reset` trên production.
4. **API:** tạo project Vercel, Root Directory `apps/api` (dùng `apps/api/vercel.json`), khai báo biến ở §2, deploy. Kiểm `GET https://<api>/api/v1/health` → `{"data":{"status":"ok"}}`.
5. **Web:** tạo project Vercel, Root Directory `apps/mobile` (dùng `apps/mobile/vercel.json`), đặt `EXPO_PUBLIC_API_URL`, deploy. Thêm URL web vào `CORS_ORIGINS` của API rồi redeploy API.
6. **Claude Console:** đặt hạn mức chi tiêu cho khóa API (R-M4).
7. **Kiểm tra sau deploy:** chạy E2E trên URL thật — `WEB_URL=https://<web> API_URL=https://<api>/api/v1 node e2e/web/mvp.e2e.cjs` (cần API chạy `AI_PROVIDER=fake` trên môi trường thử, hoặc chấp nhận gọi Claude thật).

## 4. Kịch bản trình diễn (≈ 5 phút)
1. Mở URL web → **Đăng ký** (họ tên, email, mật khẩu ≥ 8 ký tự, tick điều khoản) → đăng nhập. Không có ô "Ghi nhớ đăng nhập" trên web.
2. **Trang chủ:** số dư 0 ₫, "Chưa thiết lập số dư ban đầu".
3. Tab **Thêm chi** → nhập 50.000, chọn "Ăn uống", Lưu → bị chặn: *"Vui lòng thiết lập số dư ban đầu trước khi thêm khoản chi."*
4. **Thiết lập số dư ban đầu** = 0 → thêm khoản chi → *"Số dư không đủ"*. Sửa số dư ban đầu = 500.000.
5. Thêm khoản chi 100.000 → số dư còn 400.000; mở **Xem tất cả** → danh sách theo tháng → chi tiết khoản chi.
6. Tab **Quét hóa đơn** → chọn ảnh hóa đơn trên máy → bản nháp: cửa hàng, ngày, các món, giá, tổng; ô AI không đọc được có viền đỏ.
7. Sửa một giá cho lệch → banner "Tổng các món … khác tổng hóa đơn", nút xác nhận bị khóa → sửa lại cho khớp → chọn danh mục → **Xác nhận lưu**.
8. Trang chủ: số dư giảm đúng bằng tổng hóa đơn; chi tiết khoản chi hiển thị danh sách món. Vào **Số dư ban đầu**: đã bị khóa.
9. **Cá nhân → Đăng xuất.** Tải lại trang cũng yêu cầu đăng nhập lại.

## 5. Giới hạn đã biết (CR-01 §5)
1. Không có khoản thu, không sửa/xóa khoản chi; số dư ban đầu khóa sau khoản chi đầu tiên ⇒ chi hết hoặc nhập nhầm thì không điều chỉnh được trong MVP.
2. Expo Web: tải lại trang / đóng tab ⇒ phải đăng nhập lại (E-04).
3. AI Scan: không có màn danh sách nháp; tải lại trang khi đang sửa nháp thì không tiếp tục được nháp đó; nháp bỏ dở còn trong DB (job dọn dẹp hoãn — D-20, R-M5).
4. Dashboard: `monthly_income` luôn "0", `budget_alerts` luôn rỗng.
5. AI có thể đọc sai; người dùng luôn phải kiểm tra bản nháp. Hóa đơn có VAT/phí/giảm giá in riêng có thể làm tổng các món khác tổng tiền — người dùng sửa món/tổng cho khớp (R-07).
6. Quét hóa đơn chỉ hỗ trợ trên bản web (app native chưa có thư viện chọn ảnh; không phát hành native trong MVP).
7. Giới hạn 20 lần quét/giờ/người dùng và throttle theo IP được đếm trong bộ nhớ từng instance serverless — là giới hạn xấp xỉ khi có nhiều instance; dựa thêm vào hạn mức chi tiêu ở Claude Console.

## 6. Sự cố thường gặp
| Hiện tượng | Nguyên nhân thường gặp |
|---|---|
| API không khởi động, log "Cấu hình môi trường không hợp lệ" | Thiếu/sai biến ở §2 (log chỉ in tên biến, không in giá trị) |
| Web báo "Không có kết nối mạng" | `EXPO_PUBLIC_API_URL` sai hoặc URL web chưa có trong `CORS_ORIGINS` |
| Quét hóa đơn báo "Chưa đọc được hóa đơn…" (502) | Khóa Claude sai/hết hạn mức, model không hợp lệ hoặc quá thời gian `AI_TIMEOUT_MS` |
| "Ảnh vượt quá 4 MB" | Ảnh vẫn quá lớn sau khi nén ở trình duyệt — chọn ảnh khác |
