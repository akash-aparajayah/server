import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import databaseConfig from './config/database.config.js';

import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { BundlesModule } from './modules/bundles/bundles.module.js';
import { EntitiesModule } from './modules/entities/entities.module.js';
import { SubEntitiesModule } from './modules/sub-entities/sub-entities.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { MarginsModule } from './modules/margins/margins.module.js';
import { ProductEngineConfigsModule } from './modules/product-engine-configs/product-engine-configs.module.js';
import { ProvidersModule } from './modules/providers/providers.module.js';
import { SignalsModule } from './modules/signals/signals.module.js';
import { SubEntityProductsModule } from './modules/sub-entity-products/sub-entity-products.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('database.uri'),
      }),
    }),

    // Global rate limiting: 100 requests per 60 seconds.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    UsersModule,
    AuthModule,
    CategoriesModule,
    BundlesModule,
    EntitiesModule,
    SubEntitiesModule,
    ApiKeysModule,
    ProductsModule,
    MarginsModule,
    ProductEngineConfigsModule,
    ProvidersModule,
    SignalsModule,
    SubEntityProductsModule,
    SettingsModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
