import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { HistoryService } from './history.service.js';
import { describeCall, failureMessage } from './history.util.js';
import type { ApiKeyContext } from '../../common/interfaces/api-key-context.interface.js';

type Req = Request & { apiKey?: ApiKeyContext };

// Saves every payment API call (success and failed). Never blocks or breaks the call.
@Injectable()
export class HistoryInterceptor implements NestInterceptor {
    constructor(private readonly history: HistoryService) { }

    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = ctx.switchToHttp().getRequest<Req>();
        if (!req.apiKey) return next.handle();
        const action =
            req.originalUrl.split('?')[0].split('/').filter(Boolean).pop() ?? 'unknown';

        return next.handle().pipe(
            tap({
                next: (res) => this.save(req, action, 'success', res),
                error: (err) => this.save(req, action, 'failed', undefined, err),
            }),
        );
    }

    private save(
        req: Req,
        action: string,
        status: 'success' | 'failed',
        res?: unknown,
        err?: unknown,
    ) {
        try {
            const key = req.apiKey!;
            const failedBody =
                err instanceof HttpException
                    ? err.getResponse()
                    : { message: failureMessage(err) };
            void this.history
                .record({
                    keyId: key.keyId,
                    subEntityId: key.subEntityId,
                    environment: key.type,
                    action,
                    status,
                    statusCode:
                        status === 'failed'
                            ? err instanceof HttpException
                                ? err.getStatus()
                                : 500
                            : null,
                    errorMessage: status === 'failed' ? failureMessage(err) : null,
                    ...describeCall(action, req.body, res),
                    requestBody: req.body,
                    responseBody: status === 'success' ? res : failedBody,
                })
                .catch(() => undefined);
        } catch {
            /* history must never break a payment call */
        }
    }
}