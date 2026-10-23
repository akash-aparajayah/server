import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { FOLDER_RULES, UploadFolder } from './uploads.constants.js';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl?: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET');
    this.baseUrl = config.get<string>('ASSET_BASE_URL') || undefined;

    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.client = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'ap-south-1',
      // without keys, the IAM role (default credential chain) is used
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  // public URL if ASSET_BASE_URL is set, else null (frontend uses the key)
  urlFor(key: string): string | null {
    return this.baseUrl ? `${this.baseUrl.replace(/\/$/, '')}/${key}` : null;
  }

  async upload(
    folder: UploadFolder,
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string | null }> {
    const rule = FOLDER_RULES[folder];

    // ---- validation: client errors (400), outside the S3 try/catch ----
    if (file.size > rule.maxBytes) {
      throw new BadRequestException(
        `File too large. Max ${rule.maxBytes / 1024 / 1024}MB`,
      );
    }

    // detect the real type from the bytes, never trust the client header
    let detected: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
    try {
      detected = await fileTypeFromBuffer(file.buffer);
    } catch (e) {
      this.logger.warn(`File type detection failed: ${(e as Error).message}`);
      throw new BadRequestException('Could not read the file');
    }

    const ext = detected ? rule.types[detected.mime] : undefined;
    if (!detected || !ext) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${Object.values(rule.types).join(', ')}`,
      );
    }

    // ---- S3 upload: server/AWS errors (502) ----
    const key = `${folder}/${randomUUID()}.${ext}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: detected.mime,
        }),
      );
    } catch (e) {
      const err = e as Error;
      // log name + message only; client gets a generic message
      this.logger.error(
        `S3 upload failed (${key}): ${err.name}: ${err.message}`,
      );
      throw new BadGatewayException('File upload failed. Please try again.');
    }

    return { key, url: this.urlFor(key) };
  }

  // Cleanup must never break the main request, so errors are only logged.
  // Returns true if the object was deleted.
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (e) {
      const err = e as Error;
      this.logger.error(
        `S3 delete failed (${key}): ${err.name}: ${err.message}`,
      );
      return false;
    }
  }
}
