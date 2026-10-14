import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductEngineConfigsController } from './product-engine-configs.controller.js';
import { ProductEngineConfigsService } from './product-engine-configs.service.js';
import {
  EngineConfig,
  EngineConfigSchema,
} from './schemas/engine-config.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EngineConfig.name, schema: EngineConfigSchema },
    ]),
  ],
  controllers: [ProductEngineConfigsController],
  providers: [ProductEngineConfigsService],
  exports: [ProductEngineConfigsService],
})
export class ProductEngineConfigsModule {}
