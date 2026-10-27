import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BundlesController } from './bundles.controller.js';
import { BundlesService } from './bundles.service.js';
import { Bundle, BundleSchema } from './schemas/bundle.schema.js';
import { S3Service } from '../uploads/s3.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bundle.name, schema: BundleSchema }]),
  ],
  controllers: [BundlesController],
  providers: [BundlesService,S3Service],
  exports: [BundlesService,S3Service], // margins module will use this
})
export class BundlesModule {}
