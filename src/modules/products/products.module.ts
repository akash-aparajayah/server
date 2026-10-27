import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { Product, ProductSchema } from './schemas/product.schema.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { BundlesModule } from '../bundles/bundles.module.js';
import { S3Service } from '../uploads/s3.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CategoriesModule,
    BundlesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, S3Service],
  exports: [ProductsService, S3Service],
})
export class ProductsModule {}
