import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { Customer, CustomerSchema } from './schemas/customer.schema.js';
import { EntitiesModule } from '../entities/entities.module.js';

@Module({
    imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }]), EntitiesModule],
    controllers: [CustomersController],
    providers: [CustomersService],
    exports: [CustomersService],
})
export class CustomersModule { }