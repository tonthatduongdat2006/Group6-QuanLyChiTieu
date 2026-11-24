// P1-BE-04 — Auth: đăng ký (user + danh mục mặc định trong 1 DB tx), đăng nhập, refresh xoay vòng, đăng xuất.
import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { APP_CONFIG, type AppConfig } from '../../common/config/env';
import { CLOCK } from '../../common/config/config.module';
import type { Clock } from '../../common/dates/dates';
import { CategoryProvisioner } from '../category/category-provisioner.service';
import { normalizeEmail, validateRegister } from './auth-rules';
import { getDummyHash, hashPassword, verifyPassword } from './password';
import { decideRefresh, generateRefreshToken, hashRefreshToken } from './tokens';
import type { LoginDto, RegisterDto } from './dto/auth.dto';
import { toPublicUser, type PublicUser } from '../user/user.mapper';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

const INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly categories: CategoryProvisioner,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async register(dto: RegisterDto): Promise<PublicUser> {
    const issues = validateRegister(dto);
    if (issues.length) throw new AppError('VALIDATION_ERROR', undefined, issues);

    const email = normalizeEmail(dto.email);
    const passwordHash = await hashPassword(dto.password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName: dto.full_name.trim(),
            email,
            passwordHash,
            phone: dto.phone?.trim() || null,
            termsAcceptedAt: this.clock.now(),
          },
        });
        await this.categories.provision(tx, created.id);
        return created;
      });
      return toPublicUser(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppError('CONFLICT', 'Email đã được sử dụng', [{ field: 'email', message: 'Email đã được sử dụng' }]);
      }
      throw e;
    }
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    // Luôn chạy verify (kể cả khi không có user) để thời gian phản hồi không lộ email tồn tại
    const ok = await verifyPassword(dto.password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) throw new AppError('UNAUTHORIZED', INVALID_CREDENTIALS);
    // remember_me là hành vi phía client (D-13a); backend luôn cấp refresh token có thể thu hồi.
    return this.issueSession(this.prisma, user.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(refreshToken);
    const now = this.clock.now();
    const session = await this.prisma.authSession.findUnique({ where: { refreshTokenHash: tokenHash } });
    const decision = decideRefresh(session, now, this.config.refreshReuseGraceSeconds);

    if (decision.kind === 'REUSE_DETECTED' && session) {
      // Token đã xoay vòng bị dùng lại → coi như bị lộ: thu hồi mọi phiên của user
      await this.prisma.authSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    if (decision.kind !== 'ROTATE' || !session) throw new AppError('UNAUTHORIZED');

    return this.prisma.$transaction(async (tx) => {
      // compare-and-set: chỉ 1 request đồng thời thắng
      const { count } = await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      if (count !== 1) throw new AppError('UNAUTHORIZED');
      return this.issueSession(tx, session.userId);
    });
  }

  /** Idempotent: token không tồn tại/đã thu hồi vẫn trả ok (không tiết lộ trạng thái). */
  async logout(refreshToken: string): Promise<{ ok: true }> {
    await this.prisma.authSession.updateMany({
      where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
    return { ok: true };
  }

  /** `db` là PrismaService hoặc client trong $transaction (cùng kiểu TransactionClient). */
  private async issueSession(db: Prisma.TransactionClient, userId: string): Promise<TokenPair> {
    const refreshToken = generateRefreshToken();
    const session = await db.authSession.create({
      data: {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(this.clock.now().getTime() + this.config.refreshTtlSeconds * 1000),
      },
      select: { id: true },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id },
      { expiresIn: this.config.jwtAccessTtlSeconds },
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.config.jwtAccessTtlSeconds,
    };
  }
}
