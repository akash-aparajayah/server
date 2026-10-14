import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import { ApiResult } from '../utils/api-result.util.js';

const DEFAULT_MESSAGES: Record<string, string> = {
  GET: 'Fetched successfully',
  POST: 'Created successfully',
  PATCH: 'Updated successfully',
  PUT: 'Updated successfully',
  DELETE: 'Deleted successfully',
};

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const decoratorMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const method = ctx.switchToHttp().getRequest().method as string;

    return next.handle().pipe(
      map((raw) => {
        // 1. service kudutha message > 2. decorator > 3. default
        const fromService = raw instanceof ApiResult ? raw.message : undefined;
        const result = raw instanceof ApiResult ? raw.data : raw;
        const message =
          fromService ?? decoratorMessage ?? DEFAULT_MESSAGES[method] ?? 'Success';

        // paginated: { items, total, page, limit }
        if (
          result &&
          typeof result === 'object' &&
          Array.isArray(result.items) &&
          typeof result.total === 'number'
        ) {
          const { items, ...meta } = result;
          const totalPages = meta.limit ? Math.ceil(meta.total / meta.limit) : 1;
          return { success: true, message, data: items, meta: { ...meta, totalPages } };
        }

        return { success: true, message, data: result ?? null };
      }),
    );
  }
}