import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MarginsService } from './margins.service.js';
import { CreateMarginDto } from './dto/create-margin.dto.js';
import { UpdateMarginDto } from './dto/update-margin.dto.js';
import { MarginQueryDto } from './dto/margin-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { Role } from '../users/schemas/user.schema.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('margins')
export class MarginsController {
  constructor(private readonly service: MarginsService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateMarginDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@Query() query: MarginQueryDto) {
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
    @Body() dto: UpdateMarginDto,
  ) {
    return this.service.update(id, user.userId, dto);
  }
}