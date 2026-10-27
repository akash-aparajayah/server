// src/modules/product-templates/product-templates.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import {
  ProductTemplatesService,
  type TemplateFiles,
} from './product-templates.service.js';
import { CreateProductTemplateDto } from './dto/create-product-template.dto.js';
import { UpdateProductTemplateDto } from './dto/update-product-template.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.constants.js';

const imageFields = FileFieldsInterceptor(
  [
    { name: 'bgImage', maxCount: 1 },
    { name: 'frontImage', maxCount: 1 },
  ],
  {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_IMAGE_BYTES,
      files: 2,
    },
  },
);

@Controller('product-templates')
export class ProductTemplatesController {
  constructor(private readonly service: ProductTemplatesService) {}

  // POST /product-templates/create-product-template
  @Roles(Role.ADMIN)
  @ResponseMessage('Product template created successfully')
  @Post('create-product-template')
  @UseInterceptors(imageFields)
  create(
    @Body() dto: CreateProductTemplateDto,
    @UploadedFiles() files: TemplateFiles,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.create(dto, files, user.sub);
  }

  // GET /product-templates/get-all-product-templates?page=1&limit=10&search=
  @Roles(Role.ADMIN)
  @ResponseMessage('Product templates fetched successfully')
  @Get('get-all-product-templates')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 10));

    return this.service.findAll(p, l, search ?? '');
  }

  // GET /product-templates/:id/get-product-template
  @Roles(Role.ADMIN)
  @ResponseMessage('Product template fetched successfully')
  @Get(':id/get-product-template')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findById(id);
  }

  // PATCH /product-templates/:id/update-product-template
  @Roles(Role.ADMIN)
  @ResponseMessage('Product template updated successfully')
  @Patch(':id/update-product-template')
  @UseInterceptors(imageFields)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductTemplateDto,
    @UploadedFiles() files: TemplateFiles,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.update(id, dto, files, user.sub);
  }
}
