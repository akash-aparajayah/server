import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InstancesService } from './instances.service.js';
import { CreateInstanceDto } from './dto/create-instance.dto.js';
import { UpdateInstanceDto } from './dto/update-instance.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  create(@Body() dto: CreateInstanceDto, @CurrentUser() user: any) {
    return this.instancesService.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.instancesService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.instancesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateInstanceDto,
    @CurrentUser() user: any,
  ) {
    return this.instancesService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.instancesService.remove(id, user);
  }
}
