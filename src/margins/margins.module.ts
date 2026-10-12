import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarginsController } from './margins.controller.js';
import { MarginsService } from './margins.service.js';
import { Margin, MarginSchema } from './schemas/margin.schema.js';
import { Bundle, BundleSchema } from '../bundles/schemas/bundle.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Margin.name, schema: MarginSchema },
      { name: Bundle.name, schema: BundleSchema },
    ]),
  ],
  controllers: [MarginsController],
  providers: [MarginsService],
})
export class MarginsModule {}