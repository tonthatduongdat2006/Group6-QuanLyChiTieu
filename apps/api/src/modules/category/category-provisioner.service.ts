// P1-BE-06 — cấp danh mục mặc định cho user mới, chạy TRONG transaction đăng ký.
// Idempotent: gọi lại không tạo trùng (skipDuplicates dựa trên unique (user_id, type, name_normalized)).
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { defaultCategoryRows } from './category-rules';

@Injectable()
export class CategoryProvisioner {
  async provision(tx: Prisma.TransactionClient, userId: string): Promise<number> {
    const { count } = await tx.category.createMany({ data: defaultCategoryRows(userId), skipDuplicates: true });
    return count;
  }
}
