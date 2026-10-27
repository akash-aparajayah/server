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
import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { FOLDER_RULES, UploadFolder } from './uploads.constants.js';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly cdnUrl?: string;

  constructor(config: ConfigService) {
    // Bucket name must contain only the actual S3 bucket name.
    this.bucket = config.getOrThrow<string>('AWS_S3_BUCKET');

    // Optional folder prefix inside the bucket.
    // Example: marketplace_assets
    this.prefix = (config.get<string>('AWS_S3_PREFIX') ?? '').replace(
      /^\/+|\/+$/g,
      '',
    );

    this.cdnUrl = config.get<string>('CDN_URL') || undefined;

    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.client = new S3Client({
      region: config.get<string>('AWS_REGION') ?? 'ap-south-1',

      // Use explicit credentials only when both values are available.
      // Otherwise, use the AWS default credential provider chain.
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  // Generate a URL when an asset base URL is configured.
  urlFor(key: string): string | null {
    return this.cdnUrl ? `${this.cdnUrl.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}` : null;
  }

  async upload(
    folder: UploadFolder,
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string | null }> {
    const rule = FOLDER_RULES[folder];

    if (!file?.buffer) {
      throw new BadRequestException(
        'File is required and must be provided using memory storage',
      );
    }

    // Validate the file size.
    if (file.size > rule.maxBytes) {
      throw new BadRequestException(
        `File too large. Max ${rule.maxBytes / 1024 / 1024}MB`,
      );
    }

    // Detect the actual file type from its contents.
    let detected: Awaited<ReturnType<typeof fileTypeFromBuffer>>;

    try {
      detected = await fileTypeFromBuffer(file.buffer);
    } catch {
      throw new BadRequestException('Could not read the file');
    }

    const ext = detected ? rule.types[detected.mime] : undefined;

    if (!detected || !ext) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${Object.values(rule.types).join(', ')}`,
      );
    }

    // Build the S3 object key.
    // Example: marketplace_assets/products/<uuid>.png
    const key = [this.prefix, folder, `${randomUUID()}.${ext}`]
      .filter(Boolean)
      .join('/');

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: detected.mime,
        }),
      );

      this.logger.log(`File uploaded successfully: ${key}`);
    } catch (e) {
      const err = e as Error;

      this.logger.error(
        `S3 upload failed (${key}): ${err.name}: ${err.message}`,
      );

      throw new BadGatewayException('File upload failed. Please try again.');
    }

    return {
      key,
      url: this.urlFor(key),
    };
  }

  // Delete an object using its stored S3 key.
  // Return false on failure so cleanup does not break the main request.
  async delete(key: string): Promise<boolean> {
    try {
      // Prevent deleting arbitrary objects outside this application's prefix.
      const normalizedKey = key.replace(/^\/+/, '');

      if (
        !normalizedKey ||
        normalizedKey.split('/').includes('..') ||
        (this.prefix &&
          normalizedKey !== this.prefix &&
          !normalizedKey.startsWith(`${this.prefix}/`))
      ) {
        this.logger.warn('S3 delete skipped: invalid object key');
        return false;
      }

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
        }),
      );

      return true;
    } catch (e) {
      const err = e as Error;

      this.logger.error(`S3 delete failed: ${err.name}: ${err.message}`);

      return false;
    }
  }
}
