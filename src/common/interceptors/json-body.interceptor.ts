import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';

@Injectable()
export class JsonBodyInterceptor implements NestInterceptor {
    intercept(ctx: ExecutionContext, next: CallHandler) {
        const req = ctx.switchToHttp().getRequest();
        const raw = req.body?.data;
        if (typeof raw === 'string') {
            try {
                req.body = JSON.parse(raw);
            } catch {
                throw new BadRequestException('Invalid "data" JSON');
            }
        }
        return next.handle();
    }
}