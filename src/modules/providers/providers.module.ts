import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';

import { Provider, ProviderSchema } from './schemas/provider.schema.js';
import { Counter, CounterSchema } from '../../common/schemas/counter.schema.js';
import { S3Service } from '../uploads/s3.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Provider.name,
        schema: ProviderSchema,
      },
      {
        name: Counter.name,
        schema: CounterSchema,
      },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService,S3Service],
  exports: [ProvidersService, S3Service],
})
export class ProvidersModule {}
