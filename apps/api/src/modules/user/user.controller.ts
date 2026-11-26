// P1-BE-05 — GET/PATCH /users/me (chỉ full_name, phone; email/mật khẩu không đổi ở đây)
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { toPublicUser } from './user.mapper';

@Controller('users')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!u) throw new AppError('NOT_FOUND');
    return toPublicUser(u);
  }

  @Patch('me')
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    if (dto.full_name === undefined && dto.phone === undefined) {
      throw AppError.validation('body', 'Cần ít nhất một trường để cập nhật');
    }
    const name = dto.full_name?.trim();
    if (dto.full_name !== undefined && !name) throw AppError.validation('full_name', 'Vui lòng nhập họ tên');
    const u = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { fullName: name }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
      },
    });
    return toPublicUser(u);
  }
}
