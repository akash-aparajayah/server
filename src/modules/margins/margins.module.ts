import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarginsController } from './margins.controller.js';
import { MarginsService } from './margins.service.js';
import { Margin, MarginSchema } from './schemas/margin.schema.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Margin.name, schema: MarginSchema }]),
    ProductsModule,
  ],
  controllers: [MarginsController],
  providers: [MarginsService],
  exports: [MarginsService],
})
export class MarginsModule {}