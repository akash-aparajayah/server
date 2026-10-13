import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarginsController } from './margins.controller.js';
import { MarginsService } from './margins.service.js';
import { Margin, MarginSchema } from './schemas/margin.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Margin.name, schema: MarginSchema }]),
  ],
  controllers: [MarginsController],
  providers: [MarginsService],
  exports: [MarginsService],
})
export class MarginsModule {}
