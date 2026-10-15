import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SubEntitiesService } from './sub-entities.service.js';
import { CreateSubEntityDto } from './dto/create-sub-entity.dto.js';
import { UpdateSubEntityDto } from './dto/update-sub-entity.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('sub-entities')
export class SubEntitiesController {
  constructor(private readonly subEntitiesService: SubEntitiesService) {}

  // :entityId = parent entity id
  @ResponseMessage('Sub entity created successfully')
  @Post(':entityId/create-sub-entity')
  create(
    @Param('entityId', ParseObjectIdPipe) entityId: string,
    @Body() dto: CreateSubEntityDto,
    @CurrentUser() user: any,
  ) {
    return this.subEntitiesService.create(entityId, dto, { sub: user.sub, role: user.role });
  }

  // :entityId = parent entity id
  @ResponseMessage('Sub entities fetched successfully')
  @Get(':entityId/get-all-sub-entities')
  findAllByEntity(
    @Param('entityId', ParseObjectIdPipe) entityId: string,
    @CurrentUser() user: any,
  ) {
    return this.subEntitiesService.findAllByEntity(entityId, { sub: user.sub, role: user.role });
  }

  // :id = sub entity id
  @ResponseMessage('Sub entity fetched successfully')
  @Get(':id/get-sub-entity')
  findOne(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.subEntitiesService.findOne(id, { sub: user.sub, role: user.role });
  }

  @ResponseMessage('Sub entity updated successfully')
  @Patch(':id/update-sub-entity')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSubEntityDto,
    @CurrentUser() user: any,
  ) {
    return this.subEntitiesService.update(id, dto, { sub: user.sub, role: user.role });
  }

  @ResponseMessage('Sub entity deleted successfully')
  @Delete(':id/remove-sub-entity')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.subEntitiesService.remove(id, { sub: user.sub, role: user.role });
  }
}