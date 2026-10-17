import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import {
  CredentialSet,
  Provider,
  ProviderDocument,
  ProviderMode,
} from './schemas/provider.schema.js';

import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { CreateProviderCredentialsDto } from './dto/create-provider-credentials.dto.js';
import { UpdateProviderCredentialsDto } from './dto/update-provider-credentials.dto.js';

import type {
  CredentialSetView,
  DeleteResponse,
  ProviderCredentialSecrets,
  ProviderView,
} from './interfaces/provider.interface.js';

import { LOGO_URL_PREFIX } from '../../common/utils/logo-upload.js';

const EDITABLE_FIELDS = [
  'apiUrl',
  'tokenUrl',
  'clientId',
  'clientSecret',
  'refreshToken',
  'instanceUrl',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,
  ) {}

  // ---------- Helpers ----------

  private async findWithCredentials(id: string): Promise<ProviderDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid provider ID');
    }

    const doc = await this.providerModel
      .findById(id)
      .select(
        '+credentials ' +
          '+credentials.clientSecret ' +
          '+credentials.refreshToken',
      )
      .exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    return doc;
  }

  private toSetView(c: CredentialSet): CredentialSetView {
    return {
      mode: c.mode,
      apiUrl: c.apiUrl,
      tokenUrl: c.tokenUrl,
      clientId: c.clientId,
      hasClientSecret: Boolean(c.clientSecret),
      hasRefreshToken: Boolean(c.refreshToken),
      instanceUrl: c.instanceUrl,
      updatedAt: c.updatedAt,
    };
  }

  private toView(doc: ProviderDocument): ProviderView {
    return {
      id: doc._id,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      logo: doc.logo,
      credentials: (doc.credentials ?? []).map((credential) =>
        this.toSetView(credential),
      ),
      isActive: doc.isActive,
    };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }

  private async cleanupUploadedFile(file?: Express.Multer.File): Promise<void> {
    if (!file?.filename) return;

    await this.removeFile(`${LOGO_URL_PREFIX}/${file.filename}`);
  }

  private async removeFile(logo?: string): Promise<void> {
    if (!logo) return;

    const filePath = resolve(process.cwd(), logo.replace(/^\/+/, ''));

    const relativePath = relative(process.cwd(), filePath);

    // Never delete a file outside the application directory.
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      this.logger.warn('Skipped unsafe logo deletion path');
      return;
    }

    try {
      await unlink(filePath);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? (error as { code?: string }).code
          : undefined;

      if (code !== 'ENOENT') {
        this.logger.warn('Unable to remove provider logo');
      }
    }
  }

  // ---------- Provider CRUD ----------

  async createProvider(
    dto: CreateProviderDto,
    file?: Express.Multer.File,
  ): Promise<ProviderView> {
    if (!file) {
      throw new BadRequestException('Logo is required');
    }

    const logo = `${LOGO_URL_PREFIX}/${file.filename}`;

    try {
      const doc = await this.providerModel.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        logo,
        credentials: [],
        isActive: true,
      });

      return this.toView(doc);
    } catch (error) {
      await this.cleanupUploadedFile(file);

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('A provider with this name already exists');
      }

      throw error;
    }
  }

  async findAll(): Promise<ProviderView[]> {
    const docs = await this.providerModel
      .find()
      .select('+credentials')
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((doc) => this.toView(doc));
  }

  async findById(id: string): Promise<ProviderView> {
    const doc = await this.findWithCredentials(id);
    return this.toView(doc);
  }

  async updateProvider(
    id: string,
    dto: UpdateProviderDto,
    file?: Express.Multer.File,
  ): Promise<ProviderView> {
    const doc = await this.findWithCredentials(id);
    const oldLogo = doc.logo;

    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.phone !== undefined) doc.phone = dto.phone;
    if (dto.email !== undefined) doc.email = dto.email;

    if (file) {
      doc.logo = `${LOGO_URL_PREFIX}/${file.filename}`;
    }

    try {
      await doc.save();
    } catch (error) {
      await this.cleanupUploadedFile(file);

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('A provider with this name already exists');
      }

      throw error;
    }

    if (file) {
      await this.removeFile(oldLogo);
    }

    return this.toView(doc);
  }

  async removeProvider(id: string): Promise<DeleteResponse> {
    const doc = await this.providerModel.findByIdAndDelete(id).exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    await this.removeFile(doc.logo);

    return { deleted: true };
  }

  // ---------- Credentials: live / sandbox ----------

  async addCredentials(
    id: string,
    mode: ProviderMode,
    dto: CreateProviderCredentialsDto,
  ): Promise<ProviderView> {
    const doc = await this.findWithCredentials(id);

    if (doc.credentials.some((item) => item.mode === mode)) {
      throw new ConflictException(
        `${mode} credentials already exist. Use PATCH to update them.`,
      );
    }

    doc.credentials.push({
      mode,
      ...dto,
      updatedAt: new Date(),
    });

    doc.markModified('credentials');
    await doc.save();

    return this.toView(doc);
  }

  async updateCredentials(
    id: string,
    mode: ProviderMode,
    dto: UpdateProviderCredentialsDto,
  ): Promise<ProviderView> {
    const doc = await this.findWithCredentials(id);

    const credential = doc.credentials.find((item) => item.mode === mode);

    if (!credential) {
      throw new NotFoundException(
        `No ${mode} credentials found. Add them first.`,
      );
    }

    for (const field of EDITABLE_FIELDS) {
      const value = dto[field];

      // Missing or empty values do not erase existing secrets.
      if (value !== undefined && value !== '') {
        (credential as unknown as Record<EditableField, string>)[field] = value;
      }
    }

    credential.updatedAt = new Date();

    doc.markModified('credentials');
    await doc.save();

    return this.toView(doc);
  }

  async findCredentials(
    id: string,
    mode: ProviderMode,
  ): Promise<CredentialSetView> {
    const doc = await this.findWithCredentials(id);

    const credential = doc.credentials.find((item) => item.mode === mode);

    if (!credential) {
      throw new NotFoundException(`No ${mode} credentials found`);
    }

    return this.toSetView(credential);
  }

  async removeCredentials(
    id: string,
    mode: ProviderMode,
  ): Promise<DeleteResponse> {
    const doc = await this.providerModel
      .findById(id)
      .select('+credentials')
      .exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    const originalLength = doc.credentials.length;

    doc.credentials = doc.credentials.filter((item) => item.mode !== mode);

    if (doc.credentials.length === originalLength) {
      throw new NotFoundException(`No ${mode} credentials found`);
    }

    doc.markModified('credentials');
    await doc.save();

    return { deleted: true };
  }

  // INTERNAL ONLY:
  // Never expose this method through a public controller endpoint.
  async getCredentials(
    id: string,
    mode: ProviderMode,
  ): Promise<ProviderCredentialSecrets> {
    const doc = await this.providerModel
      .findById(id)
      .select(
        '+credentials ' +
          '+credentials.clientSecret ' +
          '+credentials.refreshToken',
      )
      .exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    if (!doc.isActive) {
      throw new BadRequestException('Provider is inactive');
    }

    const credential = doc.credentials.find((item) => item.mode === mode);

    if (!credential) {
      throw new NotFoundException(`No ${mode} credentials configured`);
    }

    return {
      mode: credential.mode,
      apiUrl: credential.apiUrl,
      tokenUrl: credential.tokenUrl,
      clientId: credential.clientId,
      clientSecret: credential.clientSecret,
      refreshToken: credential.refreshToken,
      instanceUrl: credential.instanceUrl,
    };
  }
}
