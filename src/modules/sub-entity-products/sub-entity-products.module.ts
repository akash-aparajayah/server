import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubEntityProductsController } from './sub-entity-products.controller.js';
import { SubEntityProductsService } from './sub-entity-products.service.js';
import {
  SubEntityProduct,
  SubEntityProductSchema,
} from './schemas/sub-entity-product.schema.js';
import { SubEntitiesModule } from '../sub-entities/sub-entities.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubEntityProduct.name, schema: SubEntityProductSchema },
    ]),
    SubEntitiesModule,
    ProductsModule,
  ],
  controllers: [SubEntityProductsController],
  providers: [SubEntityProductsService],
  exports: [SubEntityProductsService],
})
export class SubEntityProductsModule {}
