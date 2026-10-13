import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const origins = process.env.CLIENT_URL?.split(',').map((o) => o.trim());
  app.enableCors({
    origin: origins?.length ? origins : false,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
