import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';

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
    const custom = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const method = ctx.switchToHttp().getRequest().method as string;
    const message = custom ?? DEFAULT_MESSAGES[method] ?? 'Success';

    return next.handle().pipe(
      map((result) => {
        // paginated: { items, total, page, limit }
        if (
          result &&
          typeof result === 'object' &&
          Array.isArray(result.items) &&
          typeof result.total === 'number'
        ) {
          const { items, ...meta } = result;
          const totalPages = meta.limit
            ? Math.ceil(meta.total / meta.limit)
            : 1;
          return {
            success: true,
            message,
            data: items,
            meta: { ...meta, totalPages },
          };
        }

        return { success: true, message, data: result ?? null };
      }),
    );
  }
}
