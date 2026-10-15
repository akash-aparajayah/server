import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema.js';
import { EntitiesModule } from '../entities/entities.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
    EntitiesModule,
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}