import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { BundlesModule } from './bundles/bundles.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';
import { MarginsModule } from './margins/margins.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),

    UsersModule,
    AuthModule,
    CategoriesModule,
    BundlesModule,
    ApiKeysModule,
    MarginsModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
