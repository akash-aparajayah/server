import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeysService } from '../api-keys.service.js';
import type { ApiKeyContext } from '../../../common/interfaces/api-key-context.interface.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { apiKey?: ApiKeyContext }>();

    const rawKey = req.headers['x-api-key'];
    if (typeof rawKey !== 'string' || !rawKey) {
      throw new UnauthorizedException('API key missing');
    }

    const result = await this.apiKeys.validate(rawKey);
    if (!result) throw new UnauthorizedException('Invalid or expired API key');

    req.apiKey = result; // { keyId, subEntityId, type }
    return true;
  }
}
