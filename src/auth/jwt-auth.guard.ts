import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * Global JWT guard that skips routes marked with @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  public constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Allows public routes; otherwise requires a valid JWT.
   */
  public canActivate(context: ExecutionContext) {
    const isPublic: boolean =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  /**
   * Converts passport failures into Nest unauthorized responses.
   */
  public handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Missing or invalid access token');
    }
    return user;
  }
}
