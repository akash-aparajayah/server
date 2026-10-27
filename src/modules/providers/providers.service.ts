// src/modules/providers/providers.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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
  AuditUserView,
  CredentialSetDetailView,
  CredentialSetView,
  DeleteResponse,
  ProviderCredentialSecrets,
  ProviderListView,
  ProviderView,
} from './interfaces/provider.interface.js';

import { Counter } from '../../common/schemas/counter.schema.js';
import { S3Service } from '../uploads/s3.service.js';

const EDITABLE_FIELDS = [
  'apiUrl',
  'tokenUrl',
  'clientId',
  'clientSecret',
  'refreshToken',
  'instanceUrl',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

const USER_SELECT = 'name';

const AUDIT_POPULATE = [
  { path: 'createdBy', select: USER_SELECT },
  { path: 'updatedBy', select: USER_SELECT },
];

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    @InjectModel(Provider.name)
    private readonly providerModel: Model<ProviderDocument>,

    @InjectModel(Counter.name)
    private readonly counterModel: Model<Counter>,

    private readonly s3Service: S3Service,
  ) { }

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
      .populate(AUDIT_POPULATE)
      .exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    return doc;
  }

  private validateUserId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return new Types.ObjectId(userId);
  }

  private async populateAudit(
    doc: ProviderDocument,
  ): Promise<ProviderDocument> {
    await doc.populate(AUDIT_POPULATE);
    return doc;
  }

  private toAuditUser(user: unknown): AuditUserView | undefined {
    if (!user) return undefined;

    if (typeof user === 'object' && user !== null && 'name' in user) {
      const u = user as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
      };

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
      };
    }

    if (typeof user === 'object' && user !== null && '_id' in user) {
      const u = user as {
        _id: Types.ObjectId;
        email?: string;
      };

      return {
        id: u._id.toString(),
        email: u.email,
      };
    }

    return { id: String(user) };
  }

  private toSetView(c: CredentialSet, withSecrets = false): CredentialSetView {
    return {
      mode: c.mode,
      apiUrl: c.apiUrl,
      tokenUrl: c.tokenUrl,
      clientId: c.clientId,
      ...(withSecrets
        ? {
          clientSecret: c.clientSecret,
          refreshToken: c.refreshToken,
        }
        : {
          hasClientSecret: Boolean(c.clientSecret),
          hasRefreshToken: Boolean(c.refreshToken),
        }),
      instanceUrl: c.instanceUrl,
      updatedAt: c.updatedAt,
    };
  }

  // Use only for the protected credentials endpoint.
  private toSetDetailView(c: CredentialSet): CredentialSetDetailView {
    return {
      mode: c.mode,
      apiUrl: c.apiUrl,
      tokenUrl: c.tokenUrl,
      clientId: c.clientId,
      clientSecret: c.clientSecret,
      refreshToken: c.refreshToken,
      instanceUrl: c.instanceUrl,
      updatedAt: c.updatedAt,
    };
  }

  private toView(doc: ProviderDocument, withSecrets = false): ProviderView {
    return {
      id: doc._id,
      providerId: doc.providerCode,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,

      // MongoDB stores the S3 object key; the API returns its URL.
      logo: doc.logo
        ? (this.s3Service.urlFor(doc.logo) ?? undefined)
        : undefined,

      credentials: (doc.credentials ?? []).map((credential) =>
        this.toSetView(credential, withSecrets),
      ),
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: this.toAuditUser(doc.createdBy),
      updatedBy: this.toAuditUser(doc.updatedBy),
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

  /**
   * Attempt cleanup without hiding the original database/API error.
   */
  private async deleteS3Logo(key?: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3Service.delete(key);
    } catch {
      this.logger.warn('Unable to remove provider logo from S3');
    }
  }

  private async generateProviderCode(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'providerCode' },
      { $inc: { sequence: 1 } },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!counter) {
      throw new InternalServerErrorException(
        'Failed to generate provider code',
      );
    }

    return `PROV-${counter.sequence}`;
  }

  // ---------- Provider CRUD ----------

  async createProvider(
    dto: CreateProviderDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<ProviderView> {
    if (!file) {
      throw new BadRequestException('Logo is required');
    }

    // Validate before uploading, so invalid user IDs do not create S3 objects.
    const userObjectId = this.validateUserId(userId);

    const modes = (dto.credentials ?? []).map((c) => c.mode);

    if (new Set(modes).size !== modes.length) {
      throw new BadRequestException(
        'Each credentials mode can only be sent once',
      );
    }

    let uploadedKey: string | undefined;

    try {
      // Upload the in-memory file to S3.
      const uploaded = await this.s3Service.upload('providers', file);
      uploadedKey = uploaded.key;

      const providerCode = await this.generateProviderCode();

      const doc = await this.providerModel.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        providerCode,
        logo: uploadedKey,
        credentials: (dto.credentials ?? []).map((c) => ({
          ...c,
          updatedAt: new Date(),
        })),
        isActive: true,
        createdBy: userObjectId,
        updatedBy: userObjectId,
      });

      await this.populateAudit(doc);

      return this.toView(doc);
    } catch (error) {
      // Avoid leaving an uploaded object behind if provider creation fails.
      await this.deleteS3Logo(uploadedKey);

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A provider with this name or code already exists',
        );
      }

      throw error;
    }
  }

  async findAll(): Promise<ProviderListView[]> {
    const docs = await this.providerModel
      .find()
      .select('providerCode name phone email logo isActive createdBy updatedBy')
      .populate(AUDIT_POPULATE)
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      providerId: doc.providerCode,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      logo: doc.logo ? (this.s3Service.urlFor(doc.logo) ?? undefined) : undefined,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: this.toAuditUser(doc.createdBy),
      updatedBy: this.toAuditUser(doc.updatedBy),
    }));
  }

  async findProviderList(): Promise<any[]> {
    const docs = await this.providerModel
      .find()
      .select('providerCode name')
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      providerId: doc.providerCode,
      name: doc.name,
    }));
  }

  async findById(id: string): Promise<ProviderView> {
    const doc = await this.findWithCredentials(id);
    return this.toView(doc, true);
  }

  async updateProvider(
    id: string,
    dto: UpdateProviderDto,
    userId: string,
    file?: Express.Multer.File,
  ): Promise<ProviderView> {
    const userObjectId = this.validateUserId(userId);
    const doc = await this.findWithCredentials(id);

    const oldLogo = doc.logo;
    let newLogoKey: string | undefined;

    if (dto.name !== undefined) {
      doc.name = dto.name;
    }

    if (dto.phone !== undefined) {
      doc.phone = dto.phone;
    }

    if (dto.email !== undefined) {
      doc.email = dto.email;
    }

    // Only upload when a replacement logo is provided.
    if (file) {
      const uploaded = await this.s3Service.upload('providers', file);
      newLogoKey = uploaded.key;
      doc.logo = newLogoKey;
    }

    // Keep createdBy unchanged; update only the last editor.
    doc.updatedBy = userObjectId;

    try {
      await doc.save();
    } catch (error) {
      // If saving fails, clean up the newly uploaded logo.
      await this.deleteS3Logo(newLogoKey);

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A provider with this name or code already exists',
        );
      }

      throw error;
    }

    // Delete the old logo only after the database update succeeds.
    if (newLogoKey && oldLogo && oldLogo !== newLogoKey) {
      await this.deleteS3Logo(oldLogo);
    }

    await this.populateAudit(doc);

    return this.toView(doc);
  }

  async removeProvider(id: string): Promise<DeleteResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid provider ID');
    }

    const doc = await this.providerModel.findByIdAndDelete(id).exec();

    if (!doc) {
      throw new NotFoundException('Provider not found');
    }

    // The database deletion succeeds even if S3 cleanup fails.
    await this.deleteS3Logo(doc.logo);

    return { deleted: true };
  }

  // ---------- Credentials: live / sandbox ----------

  async addCredentials(
    id: string,
    mode: ProviderMode,
    dto: CreateProviderCredentialsDto,
    userId: string,
  ): Promise<ProviderView> {
    const userObjectId = this.validateUserId(userId);
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

    doc.updatedBy = userObjectId;

    doc.markModified('credentials');
    await doc.save();
    await this.populateAudit(doc);

    return this.toView(doc);
  }

  async updateCredentials(
    id: string,
    mode: ProviderMode,
    dto: UpdateProviderCredentialsDto,
    userId: string,
  ): Promise<ProviderView> {
    const userObjectId = this.validateUserId(userId);
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
    doc.updatedBy = userObjectId;

    doc.markModified('credentials');
    await doc.save();
    await this.populateAudit(doc);

    return this.toView(doc);
  }

  async findCredentials(
    id: string,
    mode: ProviderMode,
  ): Promise<CredentialSetDetailView> {
    const doc = await this.findWithCredentials(id);

    const credential = doc.credentials.find((item) => item.mode === mode);

    if (!credential) {
      throw new NotFoundException(`No ${mode} credentials found`);
    }

    return this.toSetDetailView(credential);
  }

  async removeCredentials(
    id: string,
    mode: ProviderMode,
    userId: string,
  ): Promise<DeleteResponse> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid provider ID');
    }

    const userObjectId = this.validateUserId(userId);

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

    doc.updatedBy = userObjectId;

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
