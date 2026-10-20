import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ProvidersService } from './providers.service.js';
import { ProviderMode } from './schemas/provider.schema.js';

import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto.js';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto.js';

import type {
  CredentialSetDetailView,
  DeleteResponse,
  ProviderListView,
  ProviderView,
} from './interfaces/provider.interface.js';

import { logoUploadOptions } from '../../common/utils/logo-upload.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // POST /providers/create-providers
  @ResponseMessage('Provider created successfully')
  @Post('create-providers')
  @UseInterceptors(FileInterceptor('logo', logoUploadOptions))
  async createProvider(
    @Body() dto: CreateProviderDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string },
  ): Promise<ProviderView> {
    return this.providersService.createProvider(dto, file, user.sub);
  }

  // GET /providers/get-all-providers
  @ResponseMessage('Providers fetched successfully')
  @Get('get-all-providers')
  async findAll(): Promise<ProviderListView[]> {
    return this.providersService.findAll();
  }

   // GET /providers/get-all-providers-list
  @ResponseMessage('Providers List fetched successfully')
  @Get('get-all-providers-list')
  async findProviderList(): Promise<any[]> {
    return this.providersService.findProviderList();
  }

  // GET /providers/:id/get-providers
  @ResponseMessage('Provider fetched successfully')
  @Get(':id/get-providers')
  async findById(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProviderView> {
    return this.providersService.findById(id);
  }

  // PATCH /providers/:id/update-providers
  @ResponseMessage('Provider updated successfully')
  @Patch(':id/update-providers')
  @UseInterceptors(FileInterceptor('logo', logoUploadOptions))
  async updateProvider(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProviderView> {
    return this.providersService.updateProvider(id, dto, user.sub, file);
  }

  // DELETE /providers/:id/delete-providers
  @ResponseMessage('Provider deleted successfully')
  @Delete(':id/delete-providers')
  async removeProvider(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<DeleteResponse> {
    return this.providersService.removeProvider(id);
  }

  // GET /providers/:id/credentials/:mode/update-provider-credential
  // Returns credential metadata and secret-presence flags only.
  @ResponseMessage('Credentials fetched successfully')
  @Get(':id/credentials/:mode/update-provider-credential')
  async findCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
  ): Promise<CredentialSetDetailView> {
    return this.providersService.findCredentials(id, mode);
  }

  // PUT /providers/:id/credentials/:mode
  // Add credentials for the first time.
  @ResponseMessage('Credentials added successfully')
  @Put(':id/credentials/:mode')
  async addCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
    @Body() dto: CreateProviderCredentialsDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ProviderView> {
    return this.providersService.addCredentials(id, mode, dto, user.sub);
  }

  // PATCH /providers/:id/credentials/:mode
  // Update only the fields sent in the request.
  @ResponseMessage('Credentials updated successfully')
  @Patch(':id/credentials/:mode')
  async updateCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
    @Body() dto: UpdateProviderCredentialsDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ProviderView> {
    return this.providersService.updateCredentials(id, mode, dto, user.sub);
  }

  // DELETE /providers/:id/credentials/:mode
  // Remove only the selected mode.
  @ResponseMessage('Credentials deleted successfully')
  @Delete(':id/credentials/:mode')
  async removeCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
    @CurrentUser() user: { sub: string },
  ): Promise<DeleteResponse> {
    return this.providersService.removeCredentials(id, mode, user.sub);
  }


}
