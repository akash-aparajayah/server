import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiDocsController } from './api-docs.controller.js';
import { ApiDocsService } from './api-docs.service.js';
import { ApiDoc, ApiDocSchema } from './schemas/api-doc.schema.js';
import { Provider, ProviderSchema } from '../providers/schemas/provider.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ApiDoc.name, schema: ApiDocSchema },
            { name: Provider.name, schema: ProviderSchema }, // needed to populate providerId
        ]),
    ],
    controllers: [ApiDocsController],
    providers: [ApiDocsService],
})
export class ApiDocsModule { }