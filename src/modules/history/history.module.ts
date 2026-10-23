import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryController } from './history.controller.js';
import { HistoryService } from './history.service.js';
import {
    StripeHistory,
    StripeHistorySchema,
} from './schemas/stripe-history.schema.js';
import {
    SubEntity,
    SubEntitySchema,
} from '../sub-entities/schemas/sub-entity.schema.js';
import { EntitiesModule } from '../entities/entities.module.js';
import { SubEntitiesModule } from '../sub-entities/sub-entities.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StripeHistory.name, schema: StripeHistorySchema },
            { name: SubEntity.name, schema: SubEntitySchema },
        ]),
        EntitiesModule,
        SubEntitiesModule,
    ],
    controllers: [HistoryController],
    providers: [HistoryService],
    exports: [HistoryService],
})
export class HistoryModule { }