-- IT-SCHEMA (bản SQL thuần) — chạy: psql -v ON_ERROR_STOP=1 -d <db_đã_migrate> -f it-schema.sql
-- Mỗi case phải BỊ TỪ CHỐI bởi DB. Toàn bộ chạy trong 1 transaction rồi ROLLBACK, không để lại dữ liệu.
BEGIN;
\pset tuples_only on
\pset format unaligned
CREATE OR REPLACE FUNCTION pg_temp.expect_fail(label text, stmt text, expected_state text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> expected_state THEN
      RAISE EXCEPTION 'FAIL % — sai lỗi: % (%), mong đợi %', label, SQLSTATE, SQLERRM, expected_state;
    END IF;
    RAISE NOTICE 'ok  %', label;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL % — câu lệnh lẽ ra bị từ chối', label;
END $$ LANGUAGE plpgsql;

INSERT INTO users (id, full_name, email, password_hash, terms_accepted_at) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'A', 'a@x.vn', 'h', now()),
  ('00000000-0000-0000-0000-00000000000b', 'B', 'b@x.vn', 'h', now());
INSERT INTO categories (id, user_id, name, name_normalized, type, is_default) VALUES
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Ăn uống', 'ăn uống', 'EXPENSE', true),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Lương', 'lương', 'INCOME', true),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Ăn uống', 'ăn uống', 'EXPENSE', true);
INSERT INTO transactions (id, user_id, category_id, type, amount, transaction_date, source) VALUES
  ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-0000000000a2', 'INCOME', 1000000, '2026-11-01', 'MANUAL');

SELECT pg_temp.expect_fail('email trùng', $q$INSERT INTO users (full_name,email,password_hash,terms_accepted_at) VALUES ('C','a@x.vn','h',now())$q$, '23505');
SELECT pg_temp.expect_fail('danh mục trùng tên chuẩn hóa', $q$INSERT INTO categories (user_id,name,name_normalized,type,is_default) VALUES ('00000000-0000-0000-0000-00000000000a','ăn uống','ăn uống','EXPENSE',false)$q$, '23505');
SELECT pg_temp.expect_fail('số tiền 0', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','EXPENSE',0,'2026-11-02','MANUAL')$q$, '23514');
SELECT pg_temp.expect_fail('số tiền âm', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','EXPENSE',-5,'2026-11-02','MANUAL')$q$, '23514');
SELECT pg_temp.expect_fail('category của người khác', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000b1','EXPENSE',1000,'2026-11-02','MANUAL')$q$, '23503');
SELECT pg_temp.expect_fail('lệch loại category', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a2','EXPENSE',1000,'2026-11-02','MANUAL')$q$, '23503');
SELECT pg_temp.expect_fail('đổi type làm lệch category', $q$UPDATE transactions SET type='EXPENSE' WHERE id='20000000-0000-0000-0000-0000000000a1'$q$, '23503');
SELECT pg_temp.expect_fail('idempotency key thiếu hash', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source,idempotency_key) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a2','INCOME',1,'2026-11-02','MANUAL','transactions.create:k1')$q$, '23514');

INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source,idempotency_key,idempotency_request_hash)
VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a2','INCOME',1,'2026-11-02','MANUAL','transactions.create:k1', repeat('a',64));
SELECT pg_temp.expect_fail('trùng idempotency key cùng user', $q$INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source,idempotency_key,idempotency_request_hash) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a2','INCOME',2,'2026-11-02','MANUAL','transactions.create:k1',repeat('b',64))$q$, '23505');
-- cùng key nhưng user khác → hợp lệ
INSERT INTO transactions (user_id,category_id,type,amount,transaction_date,source,idempotency_key,idempotency_request_hash)
VALUES ('00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-0000000000b1','EXPENSE',1,'2026-11-02','MANUAL','transactions.create:k1', repeat('a',64));

INSERT INTO budgets (user_id,category_id,month_start,limit_amount) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','2026-11-01',3000000);
SELECT pg_temp.expect_fail('ngân sách trùng tháng', $q$INSERT INTO budgets (user_id,category_id,month_start,limit_amount) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','2026-11-01',1)$q$, '23505');
SELECT pg_temp.expect_fail('month_start không phải ngày 1', $q$INSERT INTO budgets (user_id,category_id,month_start,limit_amount) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','2026-12-15',1)$q$, '23514');
SELECT pg_temp.expect_fail('hạn mức 0', $q$INSERT INTO budgets (user_id,category_id,month_start,limit_amount) VALUES ('00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000000a1','2026-12-01',0)$q$, '23514');

INSERT INTO saving_jars (id,user_id,name,target_amount) VALUES ('30000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000a','Du lịch',10000000);
SELECT pg_temp.expect_fail('nạp vào hũ người khác', $q$INSERT INTO jar_transactions (user_id,jar_id,type,amount) VALUES ('00000000-0000-0000-0000-00000000000b','30000000-0000-0000-0000-0000000000a1','DEPOSIT',1000)$q$, '23503');
SELECT pg_temp.expect_fail('hũ target 0', $q$INSERT INTO saving_jars (user_id,name,target_amount) VALUES ('00000000-0000-0000-0000-00000000000a','x',0)$q$, '23514');

INSERT INTO receipt_details (id,transaction_id,merchant_name) VALUES ('40000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-0000000000a1','Quán A');
SELECT pg_temp.expect_fail('2 receipt_details / 1 giao dịch', $q$INSERT INTO receipt_details (transaction_id) VALUES ('20000000-0000-0000-0000-0000000000a1')$q$, '23505');
SELECT pg_temp.expect_fail('receipt item giá 0', $q$INSERT INTO receipt_items (receipt_detail_id,item_name,amount,sort_order) VALUES ('40000000-0000-0000-0000-0000000000a1','x',0,1)$q$, '23514');
SELECT pg_temp.expect_fail('D-12b: không xóa cứng giao dịch có receipt', $q$DELETE FROM transactions WHERE id='20000000-0000-0000-0000-0000000000a1'$q$, '23503');

INSERT INTO ai_draft_batches (id,user_id,source_type) VALUES ('50000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000a','AI_CHAT');
INSERT INTO ai_drafts (id,user_id,batch_id,status,transaction_id) VALUES ('60000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000a','50000000-0000-0000-0000-0000000000a1','CONFIRMED','20000000-0000-0000-0000-0000000000a1');
SELECT pg_temp.expect_fail('2 draft → 1 giao dịch', $q$INSERT INTO ai_drafts (user_id,batch_id,status,transaction_id) VALUES ('00000000-0000-0000-0000-00000000000a','50000000-0000-0000-0000-0000000000a1','CONFIRMED','20000000-0000-0000-0000-0000000000a1')$q$, '23505');
SELECT pg_temp.expect_fail('draft READY mà có transaction_id', $q$INSERT INTO ai_drafts (user_id,batch_id,status,transaction_id) VALUES ('00000000-0000-0000-0000-00000000000a','50000000-0000-0000-0000-0000000000a1','READY','20000000-0000-0000-0000-0000000000a1')$q$, '23514');
SELECT pg_temp.expect_fail('draft gắn vào batch người khác', $q$INSERT INTO ai_drafts (user_id,batch_id,status) VALUES ('00000000-0000-0000-0000-00000000000b','50000000-0000-0000-0000-0000000000a1','NEEDS_INPUT')$q$, '23503');
SELECT pg_temp.expect_fail('draft amount 0', $q$INSERT INTO ai_drafts (user_id,batch_id,status,amount) VALUES ('00000000-0000-0000-0000-00000000000a','50000000-0000-0000-0000-0000000000a1','NEEDS_INPUT',0)$q$, '23514');

-- Xóa hội thoại: messages + batch + draft bị xóa, giao dịch đã xác nhận vẫn còn (AC-20)
INSERT INTO ai_conversations (id,user_id) VALUES ('70000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000a');
INSERT INTO ai_messages (id,conversation_id,role,content,idempotency_key,idempotency_request_hash) VALUES ('71000000-0000-0000-0000-0000000000a1','70000000-0000-0000-0000-0000000000a1','USER','phở 45k','ai_messages.create:m1',repeat('c',64));
SELECT pg_temp.expect_fail('tin nhắn trùng key trong hội thoại', $q$INSERT INTO ai_messages (conversation_id,role,content,idempotency_key,idempotency_request_hash) VALUES ('70000000-0000-0000-0000-0000000000a1','USER','x','ai_messages.create:m1',repeat('d',64))$q$, '23505');
UPDATE ai_draft_batches SET conversation_id='70000000-0000-0000-0000-0000000000a1', source_message_id='71000000-0000-0000-0000-0000000000a1' WHERE id='50000000-0000-0000-0000-0000000000a1';
DELETE FROM ai_conversations WHERE id='70000000-0000-0000-0000-0000000000a1';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ai_drafts WHERE id='60000000-0000-0000-0000-0000000000a1') THEN RAISE EXCEPTION 'FAIL draft chưa bị xóa theo hội thoại'; END IF;
  IF NOT EXISTS (SELECT 1 FROM transactions WHERE id='20000000-0000-0000-0000-0000000000a1') THEN RAISE EXCEPTION 'FAIL giao dịch đã xác nhận bị mất'; END IF;
  RAISE NOTICE 'ok  xóa hội thoại giữ giao dịch đã xác nhận';
END $$;

-- Soft delete (D-12a): giữ receipt child rows
UPDATE transactions SET deleted_at = now() WHERE id='20000000-0000-0000-0000-0000000000a1';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM receipt_details WHERE transaction_id='20000000-0000-0000-0000-0000000000a1') THEN RAISE EXCEPTION 'FAIL receipt bị mất khi soft delete'; END IF;
  RAISE NOTICE 'ok  soft delete giữ receipt_details';
END $$;
ROLLBACK;
\echo '✓ IT-SCHEMA (SQL): tất cả ràng buộc hoạt động'
