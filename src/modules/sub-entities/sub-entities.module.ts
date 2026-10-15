import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubEntitiesController } from './sub-entities.controller.js';
import { SubEntitiesService } from './sub-entities.service.js';
import { SubEntity, SubEntitySchema } from './schemas/sub-entity.schema.js';
import { EntitiesModule } from '../entities/entities.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SubEntity.name, schema: SubEntitySchema }]),
    EntitiesModule,
  ],
  controllers: [SubEntitiesController],
  providers: [SubEntitiesService],
  exports: [SubEntitiesService],
})
export class SubEntitiesModule {}