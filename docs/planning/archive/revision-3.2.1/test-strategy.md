# Phase 0 – Test Strategy
**Nguồn:** (2) PRD · (3) Architecture §12 · (4) ERD · (5) API. **Trạng thái:** Revision 3.2.1 (2026-11-20) – bản nháp kế hoạch, chưa được nhóm duyệt.
Test được lập kế hoạch ở Phase 0 và **tạo/chạy liên tục** theo từng task. Công cụ nêu là khuyến nghị chờ D-16. **RV-xx** = yêu cầu sửa của lượt review Revision 2. **Nguồn đã đối chiếu trực tiếp:** PRD/Architecture/ERD/API v1.1; chi tiết bằng chứng ở `review-plan-report.md` §9. Test contract phải theo đúng API v1.1 §12; mã lỗi ngoài danh mục đó chỉ là đề xuất D-15, không được kiểm thử như contract đã duyệt.

## 1. Nguyên tắc
1. Kim tự tháp: nhiều Unit (Rule/domain), vừa Integration (DB thật + API), ít E2E (hành trình quan trọng).
2. **Không test nào phụ thuộc live Claude API.** CI ép `AI_PROVIDER=fake` và chặn mạng ra ngoài; chỉ P3-TD-03 là smoke thủ công ngoài pipeline.
3. Test trên PostgreSQL thật vì bất biến nằm ở ràng buộc/transaction/khóa.
4. **Mọi test truy vết được tới FR/AC hoặc NFR** (cột "Truy vết"). Mã NFR do kế hoạch đặt theo PRD §6: **NFR-SEC** (bảo mật) · **NFR-PERF** (hiệu năng/độ bền) · **NFR-INT** (toàn vẹn dữ liệu) · **NFR-PRI** (riêng tư) · **NFR-USA** (khả dụng/bảo trì, Android/iOS, thay được AI provider).
5. Test tiền dùng BigInt/chuỗi; đồng hồ cố định theo Asia/Ho_Chi_Minh; ảnh test sinh bằng code, không dùng hóa đơn thật.

## 2. Unit Tests
| Mục | Nội dung |
|---|---|
| **Scope** | Rule FE (`rules/`), domain rules BE, primitives (Money/dates/Idempotency), máy trạng thái draft, validator DTO, session/remember-me (kho bảo mật mock), dọn cache ảnh (file system mock) |
| **Công cụ** | Jest (FE: `jest-expo`); BE: runner mặc định của `nest new` (Vitest/Jest); `fast-check` |
| **Fixtures** | Giá trị tiền biên, ngày biên (00:00–07:00 giờ VN vs UTC), bộ draft mọi trạng thái, tập giao dịch mẫu |
| **Môi trường** | Local/CI, không DB, không mạng |
| **Pass/Fail** | 100% xanh; độ phủ đề xuất: domain/Rule ≥ 95% (chờ nhóm xác nhận) |

| ID | Nội dung | Truy vết |
|---|---|---|
| UT-MONEY | chấp nhận `"1"`, `"45000"`; từ chối `"0"`, `"-1"`, `"1.5"`, `"1e3"`, `"01"`, rỗng, vượt biên; BigInt chính xác > 2^53 | AC-06, NFR-INT |
| UT-DATE | `YYYY-MM`/ngày theo VN; 23:30 UTC → ngày kế ở VN; `month_start` là ngày 1 | AC-04, AC-12 |
| UT-BAL | `available = thu − chi − nạp + rút`; **số dư ban đầu 0**; **property-based: với mọi chuỗi thao tác ngẫu nhiên, guard từ chối mọi thao tác làm số dư < 0 và số dư sau mỗi bước chấp nhận ≥ 0**; chi vượt thu bị từ chối; xóa/giảm thu nhập làm số dư âm bị từ chối; thứ tự giao dịch không đổi tổng | AC-04, AC-13, NFR-INT |
| UT-BUDGET | đúng 80% → cảnh báo (`spent×5 ≥ limit×4`); dưới 80% không; = limit chưa "vượt"; > limit vượt; hũ không đổi `spent` | AC-09 |
| UT-STAT | `net = income − expense`; hũ không vào thu/chi; % danh mục ≈ 100% | AC-12 |
| UT-DRAFT | chuyển trạng thái hợp lệ/không; `isConfirmable`; CONFIRMED/CANCELLED/EXPIRED không sửa/xác nhận lại; kiểm cả lô | AC-17, AC-18 |
| UT-RECON | tổng món = tổng; lệch ±1; món null/0/âm; không có món; giá trị lớn | AC-23, NFR-INT |
| UT-IDEM | cùng key+payload → kết quả cũ; khác payload → `409 IDEMPOTENCY_KEY_REUSED`; song song cùng key → 1 kết quả | NFR-INT |
| UT-HASH | request hash chuẩn hóa: cùng nội dung khác thứ tự khóa → cùng băm; khác số tiền/ngày/ghi chú/id đường dẫn/tên thao tác → băm khác; SHA-256 byte ảnh ổn định và không phụ thuộc resize; 64 ký tự hex thường | NFR-INT, NFR-PRI |
| UT-CAT-NORM / UT-VALID | chuẩn hóa tên danh mục & email; mật khẩu ≥ 8; terms bắt buộc | AC-02, AC-07 |
| UT-FE-SESSION | remember-me **bật**: lưu refresh token vào kho bảo mật và khôi phục phiên; **tắt**: chỉ bộ nhớ, mở lại phải đăng nhập; đăng xuất/refresh bị từ chối xóa cả hai; access token không bao giờ lưu bền | AC-03, NFR-SEC |
| UT-FE-MONEY · UT-FE-VALID · UT-FE-DRAFT · UT-FE-RECON · UT-FE-BUDGET | bản FE của MONEY/VALID/DRAFT/RECON/BUDGET-STATUS; thêm UT dọn cache ảnh sau upload/hủy/lỗi | AC-06, AC-23, AC-09, NFR-PRI |

## 3. Integration Tests
| Mục | Nội dung |
|---|---|
| **Scope** | Module API (Controller→Service→Prisma→PostgreSQL), ràng buộc DB, transaction/đồng thời/idempotency, phân quyền, AIProvider adapter (fixtures), Container FE ↔ MSW, tuân thủ OpenAPI |
| **Công cụ** | Supertest; PostgreSQL thật (container dịch vụ/Testcontainers); validator OpenAPI; MSW + RNTL |
| **Fixtures** | Factory: user A/B, danh mục, giao dịch nhiều tháng (có giao dịch hóa đơn + món), ngân sách, hũ + lịch sử, hội thoại/batch/draft mọi trạng thái; fixture AI (§5) |
| **Môi trường** | DB cô lập mỗi suite; `AI_PROVIDER=fake`; đồng hồ giả; hook trong test để ép thứ tự thực thi khi kiểm đồng thời |
| **Pass/Fail** | 100% xanh; mọi phản hồi khớp OpenAPI; ngưỡng đề xuất service ≥ 80% |

| Suite | Test cases (rút gọn) | Truy vết |
|---|---|---|
| IT-SCHEMA | từ chối số âm/0, category người khác, lệch type, trùng budget, 2 receipt_details/tx, 2 draft→1 tx; **14 cột idempotency đúng bảng/kiểu/unique scope ERD v1.1**: `transactions` (`VARCHAR idempotency_key`, `CHAR(64) idempotency_request_hash`, unique `(user_id,idempotency_key)`); `saving_jars` (`create_idempotency_key`, `create_request_hash`, unique `(user_id,create_idempotency_key)`); `jar_transactions` (`idempotency_key`, `idempotency_request_hash`, unique `(user_id,idempotency_key)`); `ai_messages` (`idempotency_key`, `idempotency_request_hash`, unique `(conversation_id,idempotency_key)` cho USER messages); `ai_draft_batches` (`idempotency_key`, `idempotency_request_hash`, unique `(user_id,source_type,idempotency_key)`; thêm `confirm_all_idempotency_key`, `confirm_all_request_hash`, unique `(user_id,confirm_all_idempotency_key)`); `ai_drafts` (`confirm_idempotency_key`, `confirm_request_hash`, unique `(user_id,confirm_idempotency_key)`). Kiểm tra hash CHAR(64), key VARCHAR, partial uniqueness khi key non-null, key/hash pair consistency; không có `create_*` ngoài `saving_jars` và không có cột ngoài ERD. **On-delete transaction/receipt child rows phải được test theo D-12a/D-12b sau khi nhóm chọn hard/soft delete; không giả định cascade.** Draft→transaction theo ERD với `SET NULL`. | NFR-INT |
| IT-ENVELOPE | envelope `data`/`error`, `request_id` mọi phản hồi, ánh xạ lỗi → mã chuẩn, không lộ stack/secret/đường dẫn, `/health` | NFR-SEC, NFR-USA |
| IT-AUTH / IT-USER | đăng ký hợp lệ; email sai/trùng; mật khẩu <8; thiếu terms; login sai → lỗi chung; refresh **xoay vòng**; dùng lại refresh cũ → thu hồi; refresh hết hạn/bị thu hồi → 401; logout thu hồi | AC-01…03, NFR-SEC |
| IT-CAT / IT-CAT-PROV | danh mục mặc định theo user; tạo tùy chỉnh; trùng chuẩn hóa → 409; không rename/xóa | AC-07 |
| IT-TX | tạo hợp lệ; amount ≤0, thiếu/sai danh mục, ngày không hợp lệ bị từ chối; không kiểm cutoff ngày tương lai cho tới khi OQ-10/D-09 được nhóm chốt; list/filter/phân trang/sắp xếp ổn định; chi tiết; sửa | AC-05, 06, 10 |
| IT-TX-CONSISTENCY | sau sửa/xóa: số dư, thống kê, ngân sách, dashboard khớp tập giao dịch còn lại | AC-11, NFR-INT |
| **IT-TX-RECEIPT-EDIT** | **hợp đồng `PATCH /transactions/{transactionId}` có sẵn của API v1.1 (D-06 ①)**: giao dịch hóa đơn: PATCH chỉ `amount` → 422; PATCH `receipt.items` + `amount` khớp → 200 và món/tổng cập nhật nguyên tử; Σ món ≠ `amount` → `RECEIPT_TOTAL_MISMATCH` và **rollback** (món + tổng giữ nguyên); món rỗng/giá ≤ 0/0 món → 422; khối `receipt` trên giao dịch không phải hóa đơn → 422; sửa category/note/date riêng vẫn được; tổng mới làm số dư âm → `422 INSUFFICIENT_BALANCE` và rollback (món + tổng giữ nguyên); hai PATCH song song không để lại trạng thái lệch | AC-11, AC-23, NFR-INT |
| **IT-TX-DEL-RECEIPT** | kiểm tra theo chính sách D-12a/D-12b được nhóm chọn: nếu hard delete thì transaction và `receipt_details`/`receipt_items` được xóa nguyên tử; nếu soft delete thì giữ child rows nhưng không xuất hiện trong active views/aggregates; trong cả hai trường hợp không có orphan rows; draft liên kết theo FK `SET NULL` của ERD; số dư/thống kê/ngân sách phản ánh đúng active transaction set | AC-11, NFR-INT |
| IT-JAR-PATCH *(chỉ khi D-11 được duyệt)* | đổi name/target không đổi lịch sử/số dư; mặc định **không chạy** vì PATCH ngoài phạm vi v1 | FR-09 |
| IT-BUD | CRUD; chỉ danh mục EXPENSE; trùng → 409; spent/remaining/percent; hũ không tính | AC-08, 09 |
| IT-JAR | tạo (+nạp đầu atomic); nạp > số dư khả dụng bị từ chối; rút > số dư hũ bị từ chối; số tiền ≤0; người chưa có thu nhập không nạp được; không ảnh hưởng thu/chi/ngân sách; **OpenAPI không khai báo endpoint PATCH/DELETE hũ**; kiểm tra contract không sinh route ngoài 6 endpoint SavingJar của API v1.1 | AC-13, 14 |
| **IT-BAL-GUARD** | **số dư không âm trên mọi đường ghi** (mỗi ca: thao tác bị từ chối → `422 INSUFFICIENT_BALANCE`, **không ghi gì, rollback toàn bộ**, số dư/giao dịch/hũ giữ nguyên): (1) người dùng mới (số dư 0) tạo chi tiêu; (2) chi tiêu > số dư; (3) sửa tăng chi tiêu làm âm; (4) giảm hoặc xóa thu nhập làm âm (vd. đã nạp hũ); (5) nạp hũ > số dư khả dụng; (6) tạo hũ + nạp đầu > số dư; (7) rút > số dư hũ; (8) xác nhận 1 draft chi tiêu làm âm (draft giữ trạng thái chờ); (9) confirm-all có tổng cuối < 0 → không lưu draft nào; (10) xác nhận hóa đơn làm âm; (11) sửa món + tổng hóa đơn làm âm; (12) ca hợp lệ ở biên: số dư dự kiến = 0 được chấp nhận | AC-13, AC-14, AC-18, AC-26, NFR-INT |
| **IT-CONC-BAL** | **Chứng minh số dư cuối không thể âm dù thao tác nào giữ khóa trước.** Với mỗi cặp (A, B) trong {chi tiêu, nạp hũ, tạo hũ+nạp đầu, xóa thu nhập, sửa tăng chi tiêu, xác nhận draft, confirm-all, xác nhận hóa đơn, sửa hóa đơn, rút hũ} sao cho cùng nhau vượt số dư: chạy **cả hai thứ tự** bằng hook (A giữ khóa trước rồi B; B trước rồi A) và kiểm: (i) hoặc cả hai thành công với số dư cuối ≥ 0, hoặc đúng một thao tác bị `INSUFFICIENT_BALANCE`/`INSUFFICIENT_JAR_BALANCE` và không để lại dấu vết; (ii) **không bao giờ cả hai thành công khi tổng vượt số dư**; (iii) số dư khả dụng cuối ≥ 0 và số dư hũ cuối ≥ 0; (iv) thao tác thất bại rollback toàn bộ (không giao dịch/draft/hũ lẻ); kèm **stress ngẫu nhiên** N yêu cầu song song trộn các thao tác trên, kiểm bất biến sau mỗi vòng | AC-14, AC-17, AC-18, NFR-INT |
| IT-CONC | confirm-all đôi; confirm lẻ xen confirm-all; không draft nào tạo 2 giao dịch | AC-17, AC-18, NFR-INT |
| IT-IDEM | **4 nhóm thao tác ghi DB có Idempotency-Key:** (1) `POST /transactions`, (2) `POST /saving-jars` (+nạp đầu), (3) `POST …/deposits`, (4) `POST …/withdrawals`. Mỗi nhóm: (a) cùng key + cùng payload → 1 bản ghi và trả đúng kết quả cũ (cùng nội dung/HTTP status, **không có response header mới**); (b) cùng key + payload khác → **`409 IDEMPOTENCY_KEY_REUSED`**; (c) 2 request song song cùng key → 1 bản ghi; (d) thiếu key → 400; (e) tài nguyên đã bị sửa rồi mới retry → vẫn trả đúng nhờ request hash; (f) thao tác bị `INSUFFICIENT_BALANCE` không làm key bị coi là đã dùng thành công | NFR-INT |
| **IT-IDEM-AI** | **4 nhóm thao tác AI có Idempotency-Key (theo hợp đồng hiện có; đúng cột: `ai_messages.idempotency_*`, `ai_draft_batches.idempotency_*`, `ai_drafts.confirm_*`, `ai_draft_batches.confirm_all_*`):** (5) gửi tin nhắn: retry cùng key → không tạo message/batch/draft trùng và không gọi provider lần hai khi đã xong, song song cùng key → 1 kết quả, cùng key + nội dung khác → 409; (6) quét hóa đơn (chi tiết IT-SCAN-IDEM/REPLAY); (7) **xác nhận draft lẻ**: replay cùng key → cùng giao dịch (200), cùng key cho draft khác → 409; (8) **confirm-all**: replay cùng key → 200 trả các giao dịch đã tạo, cùng key cho lô khác → 409, không tạo lại giao dịch | AC-15, 17, 18, 21, NFR-INT |
| IT-STAT / IT-DASH | overview, theo danh mục (cả EXPENSE/INCOME), `daily-expenses` 7 ngày điền 0 theo giờ VN; dashboard: số dư theo công thức, 5 gần nhất, cảnh báo; **không có endpoint thu nhập 7 ngày** | AC-04, 12 |
| IT-CONV / IT-CHAT | tạo/lưu/liệt kê (chỉ đã lưu)/khôi phục; xóa hội thoại giữ nguyên giao dịch và số liệu; nhiều giao dịch → nhiều draft; sửa draft vs giao dịch mới; mơ hồ → hỏi lại | AC-15, 16, 19, 20 |
| IT-DRAFT / IT-DRAFT-BATCH | PATCH revalidate; confirm lẻ không đụng draft khác; confirm-all có draft lỗi → không lưu gì + `BATCH_INVALID`; **tính combined net effect của toàn bộ draft pending (income và expense), kiểm tra projected final balance, không phụ thuộc thứ tự draft**; cả hai thứ tự của cùng tập draft phải cho cùng kết quả; nếu invalid hoặc final balance âm thì không ghi draft nào; draft hợp lệ vẫn xác nhận lẻ; không tạo lại draft đã xác nhận; EXPIRED không xác nhận theo trạng thái; không giả định mã lỗi riêng `DRAFT_NOT_CONFIRMABLE` vì API v1.1 §12 không định nghĩa mã này | AC-17, 18 |
| IT-SCAN / IT-SCAN-CONFIRM | upload hợp lệ; sai chữ ký/quá lớn/hỏng; mã/status phải theo API v1.1 §12; `PAYLOAD_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE` chỉ là đề xuất D-15 nếu cần; món thêm/sửa/xóa → validate lại; lệch tổng → `RECEIPT_TOTAL_MISMATCH`; xác nhận tạo 1 EXPENSE + details + items, lỗi giữa chừng → rollback tất cả; AI không chọn danh mục | AC-21…23, 25, 26 |
| **IT-SCAN-IDEM** | cùng key + **cùng ảnh** → trả batch/draft cũ, không gọi provider; cùng key + **ảnh khác** → **`409 IDEMPOTENCY_KEY_REUSED`** và không tạo gì; hash lưu = SHA-256 byte ảnh nhận được, ở `ai_draft_batches.idempotency_request_hash`; 2 request song song cùng key + cùng ảnh → 1 batch, provider chỉ gọi một lần | AC-21, AC-24, NFR-INT, NFR-PRI |
| **IT-SCAN-ABORT** | **Hủy TRƯỚC commit:** client ngắt kết nối khi provider đang xử lý → lời gọi provider bị hủy, **không batch/draft**, key chưa được ghi, không byte ảnh còn lại; retry cùng key chạy lại như request mới | AC-24, NFR-PRI |
| **IT-SCAN-REPLAY** | **Mất phản hồi SAU commit:** commit xong, phản hồi bị cắt; retry cùng key + cùng ảnh lấy lại đúng batch/draft đã tạo (cùng nội dung/HTTP status như lần đầu), không tạo thêm; hủy đến giữa lúc commit thì commit vẫn hoàn tất và retry nhận kết quả cũ | AC-21, AC-24, NFR-INT |
| **IT-SCAN-FAIL** | provider lỗi/timeout/429, ảnh giải mã lỗi, JSON sai → `AI_PROVIDER_ERROR`/lỗi tương ứng, không batch/draft, buffer hủy, không log ảnh | AC-24, NFR-PRI, NFR-PERF |
| IT-PRIV | sau thành công/lỗi/hủy: không có byte ảnh trong DB/log/thư mục tạm; không URL/khóa file; **chỉ còn lại fingerprint SHA-256 (64 ký tự hex) ở `ai_draft_batches.idempotency_request_hash`** | AC-24, NFR-PRI |
| IT-SEC | giới hạn tốc độ riêng cho auth/AI/upload (429), header bảo mật, phát hiện dùng lại refresh token, quét phụ thuộc/secret (CI), không lộ lỗi nội bộ | NFR-SEC |
| IT-AI-ADV | prompt-injection, JSON sai, enum lạ, số âm, UUID giả, quá nhiều giao dịch → NEEDS_INPUT hoặc từ chối, không tự lưu | NFR-SEC |
| IT-PROVIDER-MAP | timeout/429/5xx/phản hồi vô dụng → `AI_PROVIDER_ERROR`/`RATE_LIMITED`; hoán đổi FakeProvider ↔ adapter không đổi nghiệp vụ | NFR-PERF, NFR-USA |
| **IT-AUTHZ** | **Một suite duy nhất**, sinh từ OpenAPI và được các module đăng ký endpoint của mình dần theo Phase (nền: helper ở P1-SH-01); P4-BE-02 hoàn tất. Mỗi endpoint được OpenAPI đánh dấu cần Bearer × {không token → 401, token hết hạn → 401, user khác → 404 hoặc danh sách không chứa dữ liệu của A, `user_id` giả trong body bị bỏ qua}. **Kiểm tra độ phủ:** đếm tự động số operation cần Bearer trong OpenAPI generated và đối chiếu với toàn bộ operation được đánh dấu cần Bearer; endpoint công khai kiểm riêng. API v1.1 có 44 endpoint tổng, nhưng số endpoint cần Bearer không được hard-code. | NFR-SEC |
| IT-CONTRACT | phản hồi BE và mock FE khớp OpenAPI (tiền, ngày, lỗi, phân trang, header idempotency) | NFR-USA |
| IT-RETENTION *(có cổng D-20)* | hết hạn draft/dọn hội thoại bằng đồng hồ giả; không xóa transaction | OQ-07/09 |
| IT-FE-CONTAINER (RNTL+MSW) | loading/lỗi/thử lại; 401→refresh→thử lại; `INSUFFICIENT_*`, `BATCH_INVALID`, `RECEIPT_TOTAL_MISMATCH` hiển thị đúng; lỗi kích thước/media type chỉ xử lý theo contract được duyệt hoặc D-15 sau khi nhóm duyệt; invalidate sau mutation | NFR-USA |

## 4. E2E Tests
| Mục | Nội dung |
|---|---|
| **Scope** | Hành trình qua app thật ↔ API ↔ DB test, dùng fake AI |
| **Công cụ** | **Maestro** (khuyến nghị D-16) trên dev/simulator build |
| **Fixtures** | Tập dữ liệu sinh bằng script seed (dev/test), phản hồi AI từ fixtures, ảnh hóa đơn tổng hợp |
| **Môi trường** | Local/CI: DB test + backend + app; không mạng ra ngoài |
| **Pass/Fail** | Hành trình hoàn tất đúng; độc lập thứ tự; thử lại tối đa 1 lần cho flake đã ghi nhận (R-15) |

| ID | Hành trình | Truy vết |
|---|---|---|
| E2E-01 | Đăng ký → đăng nhập → đăng xuất (+ lỗi email trùng/mật khẩu ngắn/thiếu terms); **remember-me bật**: khởi động lại app vẫn đăng nhập; **tắt**: phải đăng nhập lại; refresh bị thu hồi → về Đăng nhập | AC-01…03, NFR-SEC |
| E2E-02 | Thêm chi tiêu/thu nhập hợp lệ & không hợp lệ → Dashboard cập nhật; **người dùng mới (số dư 0) không ghi được chi tiêu; chi tiêu vượt số dư bị chặn với `INSUFFICIENT_BALANCE`** | AC-04…06, NFR-INT |
| E2E-03 | Ngân sách tạo/sửa/xóa; cảnh báo 80% và vượt; hũ không tính | AC-08, 09 |
| E2E-04 | Lịch sử: lọc, xem, sửa, xóa (xác nhận) → số dư/thống kê/ngân sách đúng; **xóa/giảm thu nhập làm số dư âm bị chặn** | AC-10…12, NFR-INT |
| E2E-05 | Hũ: tạo, nạp, rút, bị từ chối khi vượt số dư khả dụng/số dư hũ | AC-13, 14 |
| E2E-06 | Chat nhiều giao dịch → nhiều draft → xác nhận lẻ, rồi confirm-all hợp lệ | AC-15, 17 |
| E2E-07 | Sửa draft vs giao dịch mới/hỏi lại; confirm-all có draft lỗi → không lưu gì, sửa rồi xác nhận | AC-16, 18 |
| E2E-08 | Lưu hội thoại → mở lại khôi phục draft chờ → xóa hội thoại, giao dịch đã xác nhận còn nguyên | AC-19, 20 |
| E2E-09 | Quét hóa đơn → lệch tổng bị chặn → sửa món/tổng → chọn danh mục → xác nhận 1 giao dịch kèm món | AC-21…23, 25, 26 |
| E2E-10 | Quét lỗi/hủy upload → không còn dữ liệu ảnh (kiểm ở API/DB) | AC-24, NFR-PRI |
| E2E-11 | Danh mục mặc định + tạo tùy chỉnh | AC-07 |
| **E2E-12** | **Sửa giao dịch hóa đơn** (món + tổng cùng lúc, sai tổng bị từ chối, tổng không sửa riêng được) và **xóa giao dịch hóa đơn** → thống kê/số dư/ngân sách khớp | AC-11, NFR-INT |

## 5. Kiểm thử Android/iOS ở mức phù hợp với CI
| Lớp | Android | iOS |
|---|---|---|
| Unit/Component (Jest, RNTL) | Mọi PR (độc lập nền tảng) | Mọi PR (cùng bộ test) |
| E2E Maestro | Emulator trên runner Linux có KVM (cấu hình EAS Workflows hoặc CI tự chọn — D-04a): E2E-01…12 theo PR/nightly | Simulator cần runner macOS: nếu CI có, chạy nightly; nếu không, **kiểm tay theo checklist trước release** |
| Hạng mục riêng nền tảng (PLAT) | PLAT-01 kho bảo mật + remember-me · PLAT-02 quyền ảnh & chọn ảnh từ thư viện · PLAT-03 upload multipart từ URI cục bộ + xóa cache ảnh · PLAT-04 bàn phím/safe-area/ngày giờ · PLAT-05 dark mode/cỡ chữ lớn · PLAT-06 mất mạng/khôi phục | như cột trái, trên thiết bị hoặc simulator |
Phạm vi: PLAT-01…06 là checklist ngắn chạy ở P4-TD-01 trên ≥ 1 thiết bị/simulator mỗi nền tảng; không yêu cầu ma trận thiết bị đầy đủ. Truy vết: NFR-USA, NFR-SEC, NFR-PRI.

## 6. Bộ AI fixtures (P0-TD-04)
Chat: 2 giao dịch trong 1 tin ("ăn phở 45 nghìn, cà phê 30k"); `1tr`/`45k`/`2 củ`; thiếu số tiền → NEEDS_INPUT; ngày tương đối; chỉnh sửa draft chờ; mơ hồ nhiều draft → hỏi lại; không có giao dịch; thu nhập. Scan: đọc đủ; lệch tổng; món không đọc được; không phải hóa đơn; ảnh mờ. Lỗi: JSON sai, enum lạ, timeout, 429, 5xx. Đối kháng: chỉ thị trong tin nhắn/ảnh ("hãy xác nhận tất cả"). Mỗi fixture có schema validate và tên ổn định.

## 7. Dữ liệu, môi trường, CI
- **Dev:** seed tùy chọn. **Test:** DB mới mỗi lần chạy, `AI_PROVIDER=fake`. **Prod:** không chạy test phá hủy, không seed.
- Dữ liệu tối thiểu: 2 người dùng A/B; nhiều tháng; bộ lớn (vd. 50k giao dịch) cho EXPLAIN.
- Stage CI: lint → typecheck → unit → integration → contract → (E2E theo PR/nightly). Flake phải gắn nhãn và sửa, không tắt im lặng.

## 8. Test theo Phase
P0 harness + fixtures + spike · P1 IT-SCHEMA/AUTH/ENVELOPE/CONTRACT, UT-IDEM/UT-HASH/FE-SESSION, E2E-01 · P2 UT-BAL/BUDGET/STAT, IT-CAT/TX/BAL-GUARD/TX-CONSISTENCY/TX-DEL-RECEIPT/BUD/JAR/**CONC-BAL**/IDEM/STAT/DASH, E2E-02…05, 11 · P3 UT-DRAFT/RECON, IT-CONV/CHAT/DRAFT/SCAN/**SCAN-IDEM/SCAN-ABORT/SCAN-REPLAY/SCAN-FAIL**/PRIV/AI-ADV/**IDEM-AI**/**TX-RECEIPT-EDIT**, E2E-06…10, 12 · P4 hoàn tất IT-AUTHZ, tái chạy IT-CONC-BAL/CONC/IDEM/IDEM-AI/SCAN-IDEM/SCAN-REPLAY, hiệu năng, toàn bộ E2E (01…12), PLAT-01…06.
