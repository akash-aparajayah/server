import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';

import { Provider, ProviderSchema } from './schemas/provider.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Provider.name,
        schema: ProviderSchema,
      },
    ]),
  ],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
