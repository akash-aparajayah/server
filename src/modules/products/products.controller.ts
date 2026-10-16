import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

import { ProductDocument } from './schemas/product.schema.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

type CurrentUserPayload = {
  sub: string;
};

type PaginatedProductsResponse = {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
};

@Controller('products')
@Roles(Role.ADMIN)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Create product draft.
  @Post('create-product')
  @ResponseMessage('Product draft created successfully')
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ProductDocument> {
    return this.productsService.create(dto, user.sub);
  }

  // Get all products with pagination, search, and filters.
  @Get('get-all-products')
  @ResponseMessage('Products fetched successfully')
  findAll(@Query() query: QueryProductDto): Promise<PaginatedProductsResponse> {
    return this.productsService.findAll(query);
  }

  // Get one product by ID.
  @Get(':id/get-product')
  @ResponseMessage('Product fetched successfully')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProductDocument> {
    return this.productsService.findOne(id);
  }

  // Update product, pricing, margin, marketplace, or dashboard.
  @Patch(':id/update-product')
  @ResponseMessage('Product updated successfully')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ProductDocument> {
    return this.productsService.update(id, dto, user.sub);
  }

  // Publish product.
  @Post(':id/publish-product')
  @ResponseMessage('Product published successfully')
  publish(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ProductDocument> {
    return this.productsService.publish(id, user.sub);
  }

  // Delete product.
  @Delete(':id/remove-product')
  @ResponseMessage('Product deleted successfully')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.productsService.remove(id);
  }
}
