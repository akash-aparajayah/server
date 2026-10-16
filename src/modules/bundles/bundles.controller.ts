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

import { BundlesService } from './bundles.service.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

import type { BundleDocument } from './schemas/bundle.schema.js';
import type { PaginatedBundlesResponse } from './bundles.service.js';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  // Create a new bundle. Only administrators can create bundles.
  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle created successfully')
  @Post('create-bundles')
  create(
    @Body() dto: CreateBundleDto,
    @CurrentUser() user: { sub: string },
  ): Promise<BundleDocument> {
    return this.bundlesService.create(dto, user.sub);
  }

  // get dashBoard DashboardContent
  @ResponseMessage('Dashboard Bundles Data fetched successfully')
  @Get('dashBoard-bundles')
  dashBoardData(): Promise<any> {
    return this.bundlesService.dashBoardData();
  }

  // Get active bundles with pagination and optional search.
  @ResponseMessage('Bundles fetched successfully')
  @Get('get-all-bundles')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,

    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,

    @Query('search')
    search?: string,
  ): Promise<PaginatedBundlesResponse> {
    return this.bundlesService.findAll(page, limit, search);
  }

  // Get one active bundle by its MongoDB ObjectId.
  @ResponseMessage('Bundle fetched successfully')
  @Get(':id/get-bundle')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<BundleDocument> {
    return this.bundlesService.findOne(id);
  }

  // Update an existing bundle. Only administrators can update bundles.
  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle updated successfully')
  @Patch(':id/update-bundles')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBundleDto,
    @CurrentUser() user: { sub: string },
  ): Promise<BundleDocument> {
    return this.bundlesService.update(id, dto, user.sub);
  }

  // Soft-delete a bundle. Only administrators can delete bundles.
  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle deleted successfully')
  @Delete(':id/delete-bundles')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.bundlesService.remove(id);
  }
}
