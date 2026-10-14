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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Roles(Role.ADMIN)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // "Save Draft" / step 1 Next
  @ResponseMessage('Product draft created successfully')
  @Post('create-product')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.create(dto, user.sub);
  }

  @ResponseMessage('Products fetched successfully')
  @Get('get-all-products')
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @ResponseMessage('Product fetched successfully')
  @Get(':id/get-product')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productsService.findOne(id);
  }

  // every step Next / Save Draft
  @ResponseMessage('Product updated successfully')
  @Patch(':id/update-product')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ) {
    return this.productsService.update(id, dto, user.sub);
  }

  // "Publish" button
  @ResponseMessage('Product published successfully')
  @Post(':id/publish-product')
  publish(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.publish(id, user.sub);
  }

  @ResponseMessage('Product deleted successfully')
  @Delete(':id/remove-product')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productsService.remove(id);
  }
}
