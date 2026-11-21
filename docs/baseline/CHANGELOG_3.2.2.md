# CHANGELOG – Planning Revision 3.2.1 → 3.2.2

Ngày: 2026-11-20
Trạng thái: GROUP APPROVED (toàn bộ Planning package).

## Nguyên tắc bảo toàn
- Giữ nguyên 5 Phase và 80 Task ID; không thêm/xóa task.
- Không sửa 4 tài liệu nguồn v1.1.
- Không viết application code, không tạo migration, không deploy.

## Các thay đổi
| File | Khu vực | Thay đổi |
|---|---|---|
| backend-plan.md | Header, §3, §5.3, §11 | Cập nhật trạng thái GROUP APPROVED; ghi D-12 `transactions.deleted_at`, receipt child retention, DELETE 204; ghi Supabase PostgreSQL + Vercel, NestJS auth (không Supabase Auth). Giữ nguyên mapping D-05 14 cột/6 bảng. |
| definition-of-done.md | Header, nguyên tắc, DB/phase gates | Phản ánh Planning đã duyệt; phân biệt phê duyệt Planning với nghiệm thu từng Phase; cập nhật D-12 marker. |
| dependency-map.md | Header, gates, D-12 dependencies | Không coi Planning/D-05/D-12 là pending approval; giữ gate nghiệm thu Phase; ghi Supabase/Vercel. |
| frontend-plan.md | Header, ranh giới triển khai | GROUP APPROVED; làm rõ Expo mobile tách biệt API Vercel, không đưa secret vào app, không dùng Supabase Auth. |
| phase-breakdown.md | Header, Phase 0/1 entry-exit | Cập nhật trạng thái và yêu cầu Supabase/contract delta D-12; giữ 5 Phase. |
| repository-audit.md | Header | Cập nhật revision/status; giữ nguyên kết quả audit đầu vào (không có source repository code trong gói audit). |
| review-plan-report.md | Title, §0, §6–§10, conclusion | Cập nhật Revision 3.2.2; xác nhận GROUP APPROVED; thêm delta D-12, Supabase/Vercel, discrepancy OQ-12. |
| risk-register.md | Header, R-21, R-23 | R-21 chuyển từ lựa chọn hard/soft còn mở sang rủi ro triển khai sai soft delete; R-23 cập nhật Supabase/Vercel và bảo vệ secrets. |
| task-breakdown.md | Header, P0-SH-01, P0-TD-01, P0-SH-03, P1-BE-01, P4-TD-02 | Loại bỏ yêu cầu phê duyệt lại; thêm Supabase env/bootstrap, D-12 marker/204; cập nhật deployment target. Giữ nguyên 80 task và IDs. |
| test-strategy.md | Header, IT-SCHEMA, IT-TX-DEL-RECEIPT | Chỉ kiểm thử soft delete đã chọn, child retention, DELETE 204 idempotent, active aggregates và balance guard; bỏ nhánh hard-delete. |

## Kiểm tra quan trọng
- D-05: mapping 14 columns / 6 tables giữ nguyên, không thêm cột/table.
- Task inventory: 80 ID duy nhất, giữ nguyên danh sách và thứ tự.
- Phases: 5.
- D-12a/b: soft delete qua `transactions.deleted_at`; giữ receipt child rows; DELETE 204 lần đầu/lặp; không restore endpoint v1; không xóa nếu projected balance âm.
- OQ-12: không tìm thấy trong 4 source docs v1.1 hoặc 10 Planning files 3.2.1. Không tự dựng nội dung; cần đối chiếu decision log khác nếu mã này tồn tại ở nơi khác.
- Supabase/Vercel: được ghi nhận là nền tảng đã chọn, không tuyên bố đã cấu hình hoặc deploy.
