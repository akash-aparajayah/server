import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BundlesModule } from '../bundles/bundles.module.js';
import { MarginsController } from './margins.controller.js';
import { MarginsService } from './margins.service.js';
import { Margin, MarginSchema } from './schemas/margin.schema.js';

@Module({
  imports: [
    BundlesModule,
    MongooseModule.forFeature([{ name: Margin.name, schema: MarginSchema }]),
  ],
  controllers: [MarginsController],
  providers: [MarginsService],
})
export class MarginsModule {}