import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductTemplatesController } from './product-templates.controller.js';
import { ProductTemplatesService } from './product-templates.service.js';
import {
    ProductTemplate,
    ProductTemplateSchema,
} from './schemas/product-template.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ProductTemplate.name, schema: ProductTemplateSchema },
        ]),
    ],
    controllers: [ProductTemplatesController],
    providers: [ProductTemplatesService],
    exports: [ProductTemplatesService],
})
export class ProductTemplatesModule { }