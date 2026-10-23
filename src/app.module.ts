import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Configuration
import databaseConfig from './config/database.config.js';

// Core application components
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Authentication and user management
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';

// Marketplace catalog
import { CategoriesModule } from './modules/categories/categories.module.js';
import { BundlesModule } from './modules/bundles/bundles.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ProductTemplatesModule } from './modules/product-templates/product-templates.module.js';

// Entities and sub-entities
import { EntitiesModule } from './modules/entities/entities.module.js';
import { SubEntitiesModule } from './modules/sub-entities/sub-entities.module.js';
import { SubEntityProductsModule } from './modules/sub-entity-products/sub-entity-products.module.js';

// Pricing and product engine
import { MarginsModule } from './modules/margins/margins.module.js';
import { ProductEngineConfigsModule } from './modules/product-engine-configs/product-engine-configs.module.js';
import { SignalsModule } from './modules/signals/signals.module.js';

// Integrations and API access
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { PublicApiModule } from './modules/public-api/public-api.module.js';
import { StripeModule } from './modules/stripe/stripe.module.js';
import { HistoryModule } from './modules/history/history.module.js';

// Application settings and file uploads
import { SettingsModule } from './modules/settings/settings.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';

@Module({
  imports: [
    // --------------------------------------------------
    // 1. Application configuration
    // --------------------------------------------------

    ConfigModule.forRoot({
      // Makes ConfigService available throughout the application.
      isGlobal: true,

      // Loads custom configuration factories, including database settings.
      load: [databaseConfig],
    }),

    // --------------------------------------------------
    // 2. MongoDB database connection
    // --------------------------------------------------

    MongooseModule.forRootAsync({
      // Inject ConfigService to access application configuration.
      inject: [ConfigService],

      // Resolve the MongoDB connection URI from database.config.ts.
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),

    // --------------------------------------------------
    // 3. Global API rate limiting
    // --------------------------------------------------

    ThrottlerModule.forRoot([
      {
        // Time window in milliseconds: 60 seconds.
        ttl: 60_000,

        // Maximum 100 requests per client within the time window.
        limit: 100,
      },
    ]),

    // --------------------------------------------------
    // 4. Register application feature modules
    // --------------------------------------------------

    // Authentication and users
    UsersModule,
    AuthModule,

    // Marketplace catalog
    CategoriesModule,
    BundlesModule,
    ProductsModule,
    ProductTemplatesModule,

    // Entity management
    EntitiesModule,
    SubEntitiesModule,
    SubEntityProductsModule,

    // Pricing and product engine
    MarginsModule,
    ProductEngineConfigsModule,
    SignalsModule,

    // API access and provider integrations
    ApiKeysModule,
    ProvidersModule,
    PublicApiModule,
    StripeModule,
    HistoryModule,

    // Other application features
    SettingsModule,
    UploadsModule,
  ],

  // Register the root controller for application-level endpoints.
  controllers: [AppController],

  providers: [
    // Register the root application service.
    AppService,

    // Register the throttling guard globally.
    // All routes are subject to rate limiting unless explicitly
    // configured otherwise in the application.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
