import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;
    let extra: Record<string, any> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { message: m, error, statusCode, ...rest } = body as any;
        if (Array.isArray(m)) {
          message = 'Validation failed'; // class-validator errors
          errors = m;
        } else {
          message = m ?? exception.message;
        }
        extra = rest; // e.g. publish "missing": [...]
      }
    } else if (exception?.code === 11000) {
      status = HttpStatus.CONFLICT; // Mongo duplicate key 
      message = 'Duplicate value';
    } else if (exception?.name === 'CastError') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid id or value';
    } else if (exception?.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST; // Mongoose validation
      message = 'Validation failed';
      errors = Object.values(exception.errors ?? {}).map((e: any) => e.message);
    } else {
      // unknown error: details 
      this.logger.error(exception?.message ?? exception, exception?.stack);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors && { errors }),
      ...extra,
      timestamp: new Date().toISOString(),
    });
  }
}
