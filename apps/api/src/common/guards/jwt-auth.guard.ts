// Guard toàn cục: mọi endpoint cần Bearer trừ @Public(). Kiểm tra cả phiên còn hiệu lực (logout có hiệu lực ngay).
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppError } from '../errors/app-error';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';
import { CLOCK } from '../config/config.module';
import type { Clock } from '../dates/dates';

interface AccessPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{ header(n: string): string | undefined; user?: AuthUser }>();
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new AppError('UNAUTHORIZED');

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      throw new AppError('UNAUTHORIZED');
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= this.clock.now()) {
      throw new AppError('UNAUTHORIZED');
    }
    req.user = { id: payload.sub, sessionId: payload.sid };
    return true;
  }
}
