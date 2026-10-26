import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { EntitiesService } from './entities.service.js';
import { CreateEntityDto } from './dto/create-entity.dto.js';
import { UpdateEntityDto } from './dto/update-entity.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.constants.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @ResponseMessage('Entity created successfully')
  @Post('create-entity')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
      },
    }),
  )
  create(
    @Body() dto: CreateEntityDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.entitiesService.create(dto, user.sub, file);
  }

  @ResponseMessage('Entities fetched successfully')
  @Get('get-all-entities')
  findAll(@CurrentUser() user: AuthUser) {
    return this.entitiesService.findAll({
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Entity fetched successfully')
  @Get(':id/get-entity')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.entitiesService.findOne(id, {
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Entity updated successfully')
  @Patch(':id/update-entity')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEntityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.entitiesService.update(id, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Entity and its sub entities deleted successfully')
  @Delete(':id/remove-entity')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.entitiesService.remove(id, {
      sub: user.sub,
      role: user.role,
    });
  }
}
