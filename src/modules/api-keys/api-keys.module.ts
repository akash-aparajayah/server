import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysService } from './api-keys.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ApiKey, ApiKeySchema } from './schemas/api-key.schema.js';
import { InstancesModule } from '../instances/instances.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiKey.name, schema: ApiKeySchema }]),
    InstancesModule,
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard], // vera modules la guard use panna
})
export class ApiKeysModule {}
