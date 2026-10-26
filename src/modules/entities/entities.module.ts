import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EntitiesController } from './entities.controller.js';
import { EntitiesService } from './entities.service.js';
import { Entity, EntitySchema } from './schemas/entity.schema.js';
import {
  SubEntity,
  SubEntitySchema,
} from '../sub-entities/schemas/sub-entity.schema.js';
import {
  ApiKey,
  ApiKeySchema,
} from '../api-keys/schemas/api-key.schema.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Entity.name, schema: EntitySchema },
      { name: SubEntity.name, schema: SubEntitySchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
    UploadsModule,
  ],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}