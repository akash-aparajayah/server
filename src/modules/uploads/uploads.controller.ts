import {
  BadRequestException,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { S3Service } from './s3.service.js';
import { MAX_DOC_BYTES } from './uploads.constants.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';

enum Folder {
  Products = 'products',
  Bundles = 'bundles',
  Entities = 'entities',
  Terms = 'terms',
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly s3: S3Service) {}

  // POST /uploads/:folder   form-data: file=<binary>
  @Public()
  @ResponseMessage('File uploaded successfully')
  @Post(':folder')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOC_BYTES, files: 1 }, // hard cap, per-folder limit service-la
    }),
  )
  upload(
    @Param('folder', new ParseEnumPipe(Folder)) folder: Folder,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('file is required (form field "file")');
    return this.s3.upload(folder, file);
  }
}
