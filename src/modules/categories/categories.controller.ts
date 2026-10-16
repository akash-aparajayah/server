import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CategoriesService } from './categories.service.js';
import type { PaginatedCategoriesResponse } from './categories.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

import { CategoryDocument } from './schemas/category.schema.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Create a category (Admin only)
  @Roles(Role.ADMIN)
  @ResponseMessage('Category created successfully')
  @Post('create-categories')
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: any,
  ): Promise<CategoryDocument> {
    return this.categoriesService.create(dto, user.sub);
  }

  // Get active categories with pagination
  @ResponseMessage('Categories fetched successfully')
  @Get('get-all-categories')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ): Promise<PaginatedCategoriesResponse> {
    return this.categoriesService.findAllCategories(page, limit);
  }

  // Get one active category by ID
  @ResponseMessage('Category fetched successfully')
  @Get(':id/get-categories')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<CategoryDocument> {
    return this.categoriesService.findOneCategories(id);
  }

  // Update an active category (Admin only)
  @Roles(Role.ADMIN)
  @ResponseMessage('Category updated successfully')
  @Patch(':id/update-categories')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ): Promise<CategoryDocument> {
    return this.categoriesService.updateCategories(id, dto, user.sub);
  }

  // Soft-delete a category (Admin only)
  @Roles(Role.ADMIN)
  @ResponseMessage('Category deleted successfully')
  @Delete(':id/remove-categories')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.categoriesService.removeCategories(id);
  }
}
