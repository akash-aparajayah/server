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
  CredentialSetView,
  DeleteResponse,
  ProviderView,
} from './interfaces/provider.interface.js';

import { logoUploadOptions } from '../../common/utils/logo-upload.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // POST /providers
  @ResponseMessage('Provider created successfully')
  @Post('create-providers')
  @UseInterceptors(FileInterceptor('logo', logoUploadOptions))
  async createProvider(
    @Body() dto: CreateProviderDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProviderView> {
    return this.providersService.createProvider(dto, file);
  }

  // GET /providers
  @ResponseMessage('Providers fetched successfully')
  @Get('get-all-providers')
  async findAll(): Promise<ProviderView[]> {
    return this.providersService.findAll();
  }

  // GET /providers/:id
  @ResponseMessage('Provider fetched successfully')
  @Get(':id/get-providers')
  async findById(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProviderView> {
    return this.providersService.findById(id);
  }

  // PATCH /providers/:id
  @ResponseMessage('Provider updated successfully')
  @Patch(':id/update-providers')
  @UseInterceptors(FileInterceptor('logo', logoUploadOptions))
  async updateProvider(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProviderDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProviderView> {
    return this.providersService.updateProvider(id, dto, file);
  }

  // DELETE /providers/:id
  @ResponseMessage('Provider deleted successfully')
  @Delete(':id/delete-providers')
  async removeProvider(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<DeleteResponse> {
    return this.providersService.removeProvider(id);
  }

  // GET /providers/:id/credentials/:mode
  // Returns credential metadata and secret-presence flags only.
  @ResponseMessage('Credentials fetched successfully')
  @Get(':id/credentials/:mode/update-provider-credential')
  async findCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
  ): Promise<CredentialSetView> {
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
  ): Promise<ProviderView> {
    return this.providersService.addCredentials(id, mode, dto);
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
  ): Promise<ProviderView> {
    return this.providersService.updateCredentials(id, mode, dto);
  }

  // DELETE /providers/:id/credentials/:mode
  // Remove only the selected mode.
  @ResponseMessage('Credentials deleted successfully')
  @Delete(':id/credentials/:mode')
  async removeCredentials(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('mode', new ParseEnumPipe(ProviderMode))
    mode: ProviderMode,
  ): Promise<DeleteResponse> {
    return this.providersService.removeCredentials(id, mode);
  }
}
