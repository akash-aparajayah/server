import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HTTP security headers
  app.use(helmet());

  // Validate incoming request bodies, query parameters, and DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Consistent success response format
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // Allow only configured frontend origins
  const origins = process.env.CLIENT_URL?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins?.length ? origins : false,
    credentials: true,
  });

  // Start the application
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
