import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isUUID } from 'class-validator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';

/** Guest pricing stays public; any supplied token must be valid. */
@Injectable()
export class OptionalVoucherAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: { authorization?: string };
        user?: AuthenticatedUser;
      }>();
    if (request.headers.authorization === undefined) return true;
    const activated = await super.canActivate(context);
    if (
      activated !== true ||
      typeof request.user?.userId !== 'string' ||
      !isUUID(request.user.userId)
    )
      throw new UnauthorizedException(
        'Token không có định danh tài khoản hợp lệ.',
      );
    return true;
  }
}
