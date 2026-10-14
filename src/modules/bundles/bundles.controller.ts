import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BundlesService } from './bundles.service.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle created successfully')
  @Post('create-bundles')
  create(@Body() dto: CreateBundleDto, @CurrentUser() user: any) {
    return this.bundlesService.create(dto, user.sub);
  }

  // logged-in users: only active bundles
  @ResponseMessage('Bundles fetched successfully')
  @Get('get-all-bundles')
  findAll() {
    return this.bundlesService.findAll(true);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('All bundles fetched successfully')
  @Get('admin/all')
  findAllAdmin() {
    return this.bundlesService.findAll();
  }

  @ResponseMessage('Bundle fetched successfully')
  @Get(':id/get-bundle')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.bundlesService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle updated successfully')
  @Patch(':id/update-bundles')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBundleDto,
    @CurrentUser() user: any,
  ) {
    return this.bundlesService.update(id, dto, user.sub);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Bundle deleted successfully')
  @Delete(':id/delete-bundles')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.bundlesService.remove(id);
  }
}
