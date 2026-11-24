// GET /categories (MVP: chỉ xem; không tạo/sửa/xóa — CR-01). Thứ tự theo danh mục mặc định (QE).
import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DEFAULT_CATEGORIES, normalizeCategoryName } from './category-rules';

const ORDER = new Map(DEFAULT_CATEGORIES.map((c, i) => [`${c.type}:${normalizeCategoryName(c.name)}`, i]));

@Controller('categories')
export class CategoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('type') type?: string) {
    if (type !== undefined && type !== 'INCOME' && type !== 'EXPENSE') throw AppError.validation('type', 'type phải là INCOME hoặc EXPENSE');
    const rows = await this.prisma.category.findMany({ where: { userId: user.id, ...(type && { type: type as 'INCOME' | 'EXPENSE' }) } });
    const rank = (c: (typeof rows)[number]) => (c.isDefault ? (ORDER.get(`${c.type}:${c.nameNormalized}`) ?? 999) : 1000);
    rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
    return rows.map((c) => ({ id: c.id, name: c.name, type: c.type, is_default: c.isDefault }));
  }
}
