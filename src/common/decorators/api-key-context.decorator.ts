import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ApiKeyContext } from '../interfaces/api-key-context.interface.js';

export const ApiKeyCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyContext =>
    ctx.switchToHttp().getRequest().apiKey,
);
