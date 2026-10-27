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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

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
import type { Express } from 'express';

export type BundleFiles = {
  backgroundImage?: Express.Multer.File[];
};

const bundleImageUpload = FileFieldsInterceptor(
  [{ name: 'backgroundImage', maxCount: 1 }],
  {
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  },
);

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle created successfully')
  @Post('create-bundles')
  @UseInterceptors(bundleImageUpload)
  create(
    @Body() dto: CreateBundleDto,
    @CurrentUser() user: { sub: string },
    @UploadedFiles() files: BundleFiles,
  ): Promise<BundleDocument> {
    return this.bundlesService.create(
      dto,
      user.sub,
      files?.backgroundImage?.[0],
    );
  }

  @ResponseMessage('Dashboard Bundles Data fetched successfully')
  @Get('dashBoard-bundles')
  dashBoardData(): Promise<unknown> {
    return this.bundlesService.dashBoardData();
  }

  @ResponseMessage('Bundles fetched successfully')
  @Get('get-all-bundles')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): Promise<PaginatedBundlesResponse> {
    return this.bundlesService.findAll(page, limit, search);
  }

  @ResponseMessage('Bundle fetched successfully')
  @Get(':id/get-bundle')
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<BundleDocument> {
    return this.bundlesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle updated successfully')
  @Patch(':id/update-bundles')
  @UseInterceptors(bundleImageUpload)
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBundleDto,
    @CurrentUser() user: { sub: string },
    @UploadedFiles() files: BundleFiles,
  ): Promise<BundleDocument> {
    return this.bundlesService.update(
      id,
      dto,
      user.sub,
      files?.backgroundImage?.[0],
    );
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle deleted successfully')
  @Delete(':id/delete-bundles')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.bundlesService.remove(id);
  }
}
