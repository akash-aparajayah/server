import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductTemplatesController } from './product-templates.controller.js';
import { ProductTemplatesService } from './product-templates.service.js';
import {
    ProductTemplate,
    ProductTemplateSchema,
} from './schemas/product-template.schema.js';
import { S3Service } from '../uploads/s3.service.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ProductTemplate.name, schema: ProductTemplateSchema },
        ]),
    ],
    controllers: [ProductTemplatesController],
    providers: [ProductTemplatesService,S3Service],
    exports: [ProductTemplatesService,S3Service],
})
export class ProductTemplatesModule { }