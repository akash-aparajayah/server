import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { EntitiesService } from './entities.service.js';
import { CreateEntityDto } from './dto/create-entity.dto.js';
import { UpdateEntityDto } from './dto/update-entity.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @ResponseMessage('Entity created successfully')
  @Post('create-entity')
  create(@Body() dto: CreateEntityDto, @CurrentUser() user: any) {
    return this.entitiesService.create(dto, user.sub);
  }

  @ResponseMessage('Entities fetched successfully')
  @Get('get-all-entities')
  findAll(@CurrentUser() user: any) {
    return this.entitiesService.findAll({ sub: user.sub, role: user.role });
  }

  @ResponseMessage('Entity fetched successfully')
  @Get(':id/get-entity')
  findOne(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.entitiesService.findOne(id, { sub: user.sub, role: user.role });
  }

  @ResponseMessage('Entity updated successfully')
  @Patch(':id/update-entity')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEntityDto,
    @CurrentUser() user: any,
  ) {
    return this.entitiesService.update(id, dto, { sub: user.sub, role: user.role });
  }

  @ResponseMessage('Entity and its sub entities deleted successfully')
  @Delete(':id/remove-entity')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.entitiesService.remove(id, { sub: user.sub, role: user.role });
  }
}