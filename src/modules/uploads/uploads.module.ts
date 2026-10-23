import { Module } from '@nestjs/common';
import { S3Service } from './s3.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController],
  providers: [S3Service],
  exports: [S3Service], // delete cleanup ku vera modules use pannum
})
export class UploadsModule {}
