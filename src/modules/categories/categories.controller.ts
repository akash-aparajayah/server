import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles(Role.ADMIN)
  @Post('create-categories')
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: any) {
    return this.categoriesService.create(dto, user.sub);
  }

  // logged-in users: only active categories
  @Get('get-all-categories')
  findAll() {
    return this.categoriesService.findAll(true);
  }

  // must be above ':id', otherwise "admin" is treated as an id
  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAllAdmin() {
    return this.categoriesService.findAll();
  }

  @Get(':id/get-categories')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/update-categories')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.categoriesService.update(id, dto, user.sub);
  }

  @Roles(Role.ADMIN)
  @Delete(':id/remove-categories')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
