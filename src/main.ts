import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  // Create the Nest app (loads every module registered in AppModule)
  const app = await NestFactory.create(AppModule);

  // Validate every request body/query against the DTO rules
  // whitelist: strips fields that are not declared in the DTO
  // transform: auto-converts types (e.g. the string "10" becomes the number 10)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Catch every error and return it in one format: { success: false, message, ... }
  app.useGlobalFilters(new AllExceptionsFilter());

  // Wrap every success response as { success: true, message, data, meta }
  // Reflector is needed so the interceptor can read the @ResponseMessage() decorator
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // Allowed frontend URLs from CLIENT_URL in .env (comma-separated for multiple)
  const origins = process.env.CLIENT_URL?.split(',').map((o) => o.trim());

  // CORS: lets the browser frontend call this API
  // origin: if CLIENT_URL is not set, all origins are blocked (safe default)
  // credentials: allows cookies and auth headers
  app.enableCors({
    origin: origins?.length ? origins : false,
    credentials: true,
  });

  // Start the server on PORT from .env, or 3000 if it is not set
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
