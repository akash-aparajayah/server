import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubEntitiesController } from './sub-entities.controller.js';
import { SubEntitiesService } from './sub-entities.service.js';
import { SubEntity, SubEntitySchema } from './schemas/sub-entity.schema.js';
import { EntitiesModule } from '../entities/entities.module.js';
import { Product, ProductSchema } from '../products/schemas/product.schema.js';
import { Margin, MarginSchema } from '../margins/schemas/margin.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubEntity.name, schema: SubEntitySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Margin.name, schema: MarginSchema },
    ]),
    EntitiesModule,
  ],
  controllers: [SubEntitiesController],
  providers: [SubEntitiesService],
  exports: [SubEntitiesService],
})
export class SubEntitiesModule { }