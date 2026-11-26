# Nghiệm thu MVP (M3-03) · nhóm ký

| # | Điều kiện | Bằng chứng | Trạng thái |
|---|---|---|---|
| 1 | Production: đã đọc `_prisma_migrations` trước khi `migrate deploy`; ghi kết quả | log | ☐ |
| 2 | URL công khai Expo Web + API chạy qua HTTPS; giảng viên tự đăng ký được (**không** tài khoản demo) | URL | ☐ |
| 3 | IT-SEC xanh (không lộ stack/secret; header; throttle 10/phút/IP và 20/giờ/user trả 429) | log CI | ☐ |
| 4 | IT-AUTHZ xanh cho 15 endpoint cần Bearer | log CI | ☐ |
| 5 | Playwright E2E-01, 02, 09, 10, 13 xanh trên URL thật | log/video | ☐ |
| 6 | Regression IT-BAL-GUARD, IT-CONC-BAL, IT-SCAN-IDEM, IT-PRIV xanh | log CI | ☐ |
| 7 | Không có secret trong repo/bundle; Claude API key chỉ ở cấu hình nền tảng; đặt hạn mức chi tiêu | báo cáo quét | ☐ |
| 8 | `docs/runbook.md` có hướng dẫn sử dụng và giới hạn đã biết (CR-01 §5) | file | ☐ |

Người ký: ____________________  Ngày: __________
