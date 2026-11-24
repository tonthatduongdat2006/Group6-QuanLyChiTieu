-- CR-02 (D-27): số dư ban đầu. Migration bổ sung, không sửa baseline.
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "opening_balance" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "opening_balance_set_at" TIMESTAMPTZ(6);

-- CR-02 OB-2: số dư ban đầu là số nguyên VND không âm (SQL bổ sung trong migration do Prisma tạo — K10b)
ALTER TABLE "users" ADD CONSTRAINT "users_opening_balance_non_negative_chk" CHECK ("opening_balance" >= 0);
