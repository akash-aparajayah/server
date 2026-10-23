import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { loadSecrets } from './config/secrets.loader.js';

// Bootstrap function: initializes and starts the NestJS application.
async function bootstrap() {
  // Load secrets and configuration before initializing the application.
  await loadSecrets();

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in AWS Secrets Manager and .env');
  }

  // Create the NestJS application using the root AppModule.
  const app = await NestFactory.create(AppModule);

  // -------------------- HTTP Security --------------------

  // Add security-related HTTP headers to help protect the application
  // against common web vulnerabilities.
  app.use(helmet());

  // -------------------- Request Validation --------------------

  // Apply validation globally to incoming requests using DTO rules.
  app.useGlobalPipes(
    new ValidationPipe({
      // Remove properties that are not defined in the DTO.
      whitelist: true,

      // Reject requests containing properties not defined in the DTO.
      forbidNonWhitelisted: true,

      // Automatically convert incoming values to expected DTO types
      // where supported by the configured transformation rules.
      transform: true,
    }),
  );

  // -------------------- Global Error Handling --------------------

  // Handle exceptions across the application through one central filter.
  // This helps return a consistent error response format.
  app.useGlobalFilters(new AllExceptionsFilter());

  // -------------------- Global Response Formatting --------------------

  // Apply the interceptor to successful API responses.
  // Reflector provides access to route and handler metadata,
  // which the interceptor can use when formatting responses.
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // -------------------- CORS Configuration --------------------

  // Read allowed frontend URLs from the CLIENT_URL environment variable.
  // Multiple URLs can be separated by commas.
  const origins = process.env.CLIENT_URL?.split(',')
    .map((origin) => origin.trim()) // Remove extra spaces around each URL.
    .filter(Boolean); // Remove empty values.

  // Allow cross-origin requests only from the configured frontend origins.
  app.enableCors({
    // If valid origins are configured, allow those origins.
    // Otherwise, disable cross-origin access through this configuration.
    origin: origins?.length ? origins : false,

    // Allow cookies and other credentials in cross-origin requests.
    credentials: true,
  });

  // -------------------- Start the Server --------------------

  // Start the application on the configured PORT.
  // Use port 3000 if PORT is not defined.
  await app.listen(process.env.PORT ?? 3000);
}

// Execute the bootstrap function to start the application.
bootstrap();
