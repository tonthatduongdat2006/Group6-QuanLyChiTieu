-- P1-BE-01 baseline — ERD v1.1 (14 bảng) + D-12a (transactions.deleted_at) + D-12b (giữ receipt child rows).
-- Phần 1 viết theo đúng quy ước đặt tên của Prisma để `prisma migrate diff` không báo drift.
-- Phần 2 (cuối file) là SQL thô cho CHECK mà Prisma không biểu diễn được.
-- KHÔNG sửa file này sau khi đã áp dụng ở bất kỳ môi trường nào; thay đổi = migration mới.

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'AI_CHAT', 'AI_SCAN');

-- CreateEnum
CREATE TYPE "JarTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('NEEDS_INPUT', 'READY', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "BatchSourceType" AS ENUM ('AI_CHAT', 'AI_SCAN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "terms_accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "name_normalized" VARCHAR(50) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "is_default" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "note" TEXT,
    "source" "TransactionSource" NOT NULL,
    "idempotency_key" VARCHAR(200),
    "idempotency_request_hash" CHAR(64),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "month_start" DATE NOT NULL,
    "limit_amount" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saving_jars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "target_amount" BIGINT NOT NULL,
    "create_idempotency_key" VARCHAR(200),
    "create_request_hash" CHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saving_jars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jar_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "jar_id" UUID NOT NULL,
    "type" "JarTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "idempotency_key" VARCHAR(200),
    "idempotency_request_hash" CHAR(64),

    CONSTRAINT "jar_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "is_saved" BOOLEAN NOT NULL DEFAULT false,
    "saved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "idempotency_key" VARCHAR(200),
    "idempotency_request_hash" CHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_draft_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "source_message_id" UUID,
    "source_type" "BatchSourceType" NOT NULL,
    "idempotency_key" VARCHAR(200),
    "idempotency_request_hash" CHAR(64),
    "confirm_all_idempotency_key" VARCHAR(200),
    "confirm_all_request_hash" CHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_draft_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "transaction_type" "TransactionType",
    "amount" BIGINT,
    "category_id" UUID,
    "transaction_date" DATE,
    "note" TEXT,
    "merchant_name" VARCHAR(200),
    "status" "DraftStatus" NOT NULL,
    "validation_errors" JSONB,
    "transaction_id" UUID,
    "confirm_idempotency_key" VARCHAR(200),
    "confirm_request_hash" CHAR(64),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_draft_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "draft_id" UUID NOT NULL,
    "item_name" VARCHAR(200),
    "amount" BIGINT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "ai_draft_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "merchant_name" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receipt_detail_id" UUID NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "amount" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_type_name_normalized_key" ON "categories"("user_id", "type", "name_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_id_key" ON "categories"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_type_key" ON "categories"("id", "type");

-- CreateIndex
CREATE INDEX "transactions_user_id_transaction_date_idx" ON "transactions"("user_id", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_transaction_date_idx" ON "transactions"("user_id", "category_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_idempotency_key_key" ON "transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "budgets_user_id_month_start_idx" ON "budgets"("user_id", "month_start");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_category_id_month_start_key" ON "budgets"("user_id", "category_id", "month_start");

-- CreateIndex
CREATE UNIQUE INDEX "saving_jars_user_id_create_idempotency_key_key" ON "saving_jars"("user_id", "create_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "saving_jars_user_id_id_key" ON "saving_jars"("user_id", "id");

-- CreateIndex
CREATE INDEX "jar_transactions_jar_id_transaction_date_idx" ON "jar_transactions"("jar_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "jar_transactions_user_id_idempotency_key_key" ON "jar_transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_messages_conversation_id_idempotency_key_key" ON "ai_messages"("conversation_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_draft_batches_user_id_source_type_idempotency_key_key" ON "ai_draft_batches"("user_id", "source_type", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_draft_batches_user_id_confirm_all_idempotency_key_key" ON "ai_draft_batches"("user_id", "confirm_all_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_draft_batches_user_id_id_key" ON "ai_draft_batches"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_drafts_transaction_id_key" ON "ai_drafts"("transaction_id");

-- CreateIndex
CREATE INDEX "ai_drafts_batch_id_status_idx" ON "ai_drafts"("batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_drafts_user_id_confirm_idempotency_key_key" ON "ai_drafts"("user_id", "confirm_idempotency_key");

-- CreateIndex
CREATE INDEX "ai_draft_items_draft_id_sort_order_idx" ON "ai_draft_items"("draft_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_details_transaction_id_key" ON "receipt_details"("transaction_id");

-- CreateIndex
CREATE INDEX "receipt_items_receipt_detail_id_sort_order_idx" ON "receipt_items"("receipt_detail_id", "sort_order");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_category_id_fkey" FOREIGN KEY ("user_id", "category_id") REFERENCES "categories"("user_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_type_fkey" FOREIGN KEY ("category_id", "type") REFERENCES "categories"("id", "type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_category_id_fkey" FOREIGN KEY ("user_id", "category_id") REFERENCES "categories"("user_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saving_jars" ADD CONSTRAINT "saving_jars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jar_transactions" ADD CONSTRAINT "jar_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jar_transactions" ADD CONSTRAINT "jar_transactions_user_id_jar_id_fkey" FOREIGN KEY ("user_id", "jar_id") REFERENCES "saving_jars"("user_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "ai_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_user_id_batch_id_fkey" FOREIGN KEY ("user_id", "batch_id") REFERENCES "ai_draft_batches"("user_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_draft_items" ADD CONSTRAINT "ai_draft_items_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "ai_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_detail_id_fkey" FOREIGN KEY ("receipt_detail_id") REFERENCES "receipt_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═════════════════ Phần 2 — SQL thô (Prisma không quản lý CHECK) ═════════════════
-- Tiền dương (ERD §5 "Positive money constraints at database ... levels")
ALTER TABLE "transactions"     ADD CONSTRAINT "transactions_amount_positive_chk"      CHECK ("amount" > 0);
ALTER TABLE "budgets"          ADD CONSTRAINT "budgets_limit_amount_positive_chk"     CHECK ("limit_amount" > 0);
ALTER TABLE "saving_jars"      ADD CONSTRAINT "saving_jars_target_amount_positive_chk" CHECK ("target_amount" > 0);
ALTER TABLE "jar_transactions" ADD CONSTRAINT "jar_transactions_amount_positive_chk"  CHECK ("amount" > 0);
ALTER TABLE "receipt_items"    ADD CONSTRAINT "receipt_items_amount_positive_chk"     CHECK ("amount" > 0);
ALTER TABLE "ai_drafts"        ADD CONSTRAINT "ai_drafts_amount_positive_chk"         CHECK ("amount" IS NULL OR "amount" > 0);
ALTER TABLE "ai_draft_items"   ADD CONSTRAINT "ai_draft_items_amount_positive_chk"    CHECK ("amount" IS NULL OR "amount" > 0);
-- month_start luôn là ngày 1 (ERD §3.5)
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_month_start_first_day_chk" CHECK (EXTRACT(DAY FROM "month_start") = 1);
-- Hash là SHA-256 hex chữ thường
ALTER TABLE "auth_sessions"    ADD CONSTRAINT "auth_sessions_token_hash_hex_chk" CHECK ("refresh_token_hash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "transactions"     ADD CONSTRAINT "transactions_idem_hash_hex_chk"    CHECK ("idempotency_request_hash" IS NULL OR "idempotency_request_hash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "saving_jars"      ADD CONSTRAINT "saving_jars_idem_hash_hex_chk"     CHECK ("create_request_hash" IS NULL OR "create_request_hash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "jar_transactions" ADD CONSTRAINT "jar_transactions_idem_hash_hex_chk" CHECK ("idempotency_request_hash" IS NULL OR "idempotency_request_hash" ~ '^[0-9a-f]{64}$');
ALTER TABLE "ai_messages"      ADD CONSTRAINT "ai_messages_idem_hash_hex_chk"      CHECK ("idempotency_request_hash" IS NULL OR "idempotency_request_hash" ~ '^[0-9a-f]{64}$');
-- Key và hash đi theo cặp
ALTER TABLE "transactions"     ADD CONSTRAINT "transactions_idem_pair_chk"     CHECK (("idempotency_key" IS NULL) = ("idempotency_request_hash" IS NULL));
ALTER TABLE "saving_jars"      ADD CONSTRAINT "saving_jars_idem_pair_chk"      CHECK (("create_idempotency_key" IS NULL) = ("create_request_hash" IS NULL));
ALTER TABLE "jar_transactions" ADD CONSTRAINT "jar_transactions_idem_pair_chk" CHECK (("idempotency_key" IS NULL) = ("idempotency_request_hash" IS NULL));
ALTER TABLE "ai_messages"      ADD CONSTRAINT "ai_messages_idem_pair_chk"      CHECK (("idempotency_key" IS NULL) = ("idempotency_request_hash" IS NULL));
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_idem_pair_chk" CHECK (("idempotency_key" IS NULL) = ("idempotency_request_hash" IS NULL));
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_confirm_all_pair_chk" CHECK (("confirm_all_idempotency_key" IS NULL) = ("confirm_all_request_hash" IS NULL));
ALTER TABLE "ai_drafts"        ADD CONSTRAINT "ai_drafts_confirm_pair_chk"     CHECK (("confirm_idempotency_key" IS NULL) = ("confirm_request_hash" IS NULL));
-- Draft CONFIRMED phải trỏ tới giao dịch lúc xác nhận; draft chưa xác nhận không được trỏ.
-- (transaction_id có thể về NULL do FK SET NULL theo ERD §3.11, nên chỉ cấm chiều "chưa xác nhận mà có giao dịch".)
ALTER TABLE "ai_drafts" ADD CONSTRAINT "ai_drafts_tx_only_when_confirmed_chk" CHECK ("transaction_id" IS NULL OR "status" = 'CONFIRMED');
-- Batch AI_SCAN không thuộc hội thoại; chỉ tin nhắn USER mới có idempotency key
ALTER TABLE "ai_draft_batches" ADD CONSTRAINT "ai_draft_batches_scan_no_conversation_chk" CHECK ("source_type" <> 'AI_SCAN' OR "conversation_id" IS NULL);
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_key_user_only_chk" CHECK ("idempotency_key" IS NULL OR "role" = 'USER');
