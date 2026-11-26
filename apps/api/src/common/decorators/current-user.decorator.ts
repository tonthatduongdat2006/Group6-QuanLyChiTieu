import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  sessionId: string;
}

/** Lấy user từ access token. KHÔNG BAO GIỜ đọc user_id từ body/query (API v1.1 §1.6). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
