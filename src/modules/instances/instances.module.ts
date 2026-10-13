import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InstancesController } from './instances.controller.js';
import { InstancesService } from './instances.service.js';
import { Instance, InstanceSchema } from './schemas/instance.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Instance.name, schema: InstanceSchema },
    ]),
  ],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService], // api-keys module use pannum
})
export class InstancesModule {}
