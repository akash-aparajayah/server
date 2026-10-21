import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalsController } from './signals.controller.js';
import { SignalsService } from './signals.service.js';
import { ProductSignal, ProductSignalSchema } from './schemas/signal.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductSignal.name, schema: ProductSignalSchema },
    ]),
  ],
  controllers: [SignalsController],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
