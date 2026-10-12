import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto.js';
import { ApiKeyQueryDto } from './dto/api-key-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { Role } from '../users/schemas/user.schema.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateApiKeyDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@Query() query: ApiKeyQueryDto) {
    return this.service.findAll(query.projectId);
  }

  @Patch(':id/regenerate')
  regenerate(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: RegenerateApiKeyDto) {
    return this.service.regenerate(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}