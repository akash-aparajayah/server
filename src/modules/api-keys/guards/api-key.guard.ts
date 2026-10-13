import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const rawKey = req.headers['x-api-key'];
    if (typeof rawKey !== 'string' || !rawKey) {
      throw new UnauthorizedException('API key missing');
    }

    const result = await this.apiKeys.validate(rawKey);
    if (!result) throw new UnauthorizedException('Invalid or expired API key');

    req.apiKey = result; // { keyId, instanceId }
    return true;
  }
}
