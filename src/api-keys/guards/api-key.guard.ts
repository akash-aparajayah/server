import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = req.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;
    if (!rawKey) throw new UnauthorizedException('Missing x-api-key header');

    req.apiKey = await this.apiKeys.validate(rawKey);
    return true;
  }
}