import {
  BadRequestException,
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

import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';
import { MAX_IMAGE_BYTES } from '../uploads/uploads.constants.js';

@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ResponseMessage('User created successfully')
  @Post('create-user')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ResponseMessage('Users fetched successfully')
  @Get('get-all-user')
  findAll() {
    return this.usersService.findAll();
  }

  @ResponseMessage('User fetched successfully')
  @Get(':id/get-user')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @ResponseMessage('User updated successfully')
  @Patch(':id/update-user')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @ResponseMessage('User deleted successfully')
  @Delete(':id/remove-user')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.remove(id);
  }

  @ResponseMessage('Profile image updated successfully')
  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_IMAGE_BYTES,
        files: 1,
      },
    }),
  )
  updateProfileImage(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Profile image is required (form field "file")',
      );
    }

    return this.usersService.updateProfileImage(user.sub, file);
  }
}
