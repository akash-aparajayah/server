import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BundlesController } from './bundles.controller.js';
import { BundlesService } from './bundles.service.js';
import { Bundle, BundleSchema } from './schemas/bundle.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Bundle.name, schema: BundleSchema }])],
  controllers: [BundlesController],
  providers: [BundlesService],
  exports: [BundlesService],
})
export class BundlesModule {}