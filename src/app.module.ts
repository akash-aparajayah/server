import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { BundlesModule } from './modules/bundles/bundles.module.js';
import { ApiKeysModule } from './modules/api-keys/api-keys.module.js';
import { MarginsModule } from './modules/margins/margins.module.js';
import databaseConfig from './config/database.config.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ProductEngineConfigsModule } from './modules/product-engine-configs/product-engine-configs.module.js';

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

    UsersModule,
    AuthModule,
    CategoriesModule,
    BundlesModule,
    ApiKeysModule,
    MarginsModule,
    ProductsModule,
    ProductEngineConfigsModule
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
