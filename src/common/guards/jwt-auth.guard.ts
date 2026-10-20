import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UsersService } from '../../modules/users/users.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest();

    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Access token required');
    }

    try {
      const payload = await this.jwt.verifyAsync(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid access token');
      }

      const user = await this.usersService
        .findOne(payload.sub)
        .catch(() => null);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User is inactive or not found');
      }

      request.user = {
        sub: user._id.toString(),
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
