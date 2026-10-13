import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BundlesService } from './bundles.service.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { BundleQueryDto } from './dto/bundle-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('bundles')
export class BundlesController {
  constructor(private readonly service: BundlesService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateBundleDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@Query() query: BundleQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateBundleDto,
  ) {
    return this.service.update(id, user.userId, dto);
  }
}