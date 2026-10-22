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
  AuditUserView,
  CredentialSetDetailView,
  CredentialSetView,
  DeleteResponse,
  ProviderCredentialSecrets,
  ProviderListView,
  ProviderView,
} from './interfaces/provider.interface.js';

import { LOGO_URL_PREFIX } from '../../common/utils/logo-upload.js';
import { Counter } from '../../common/schemas/counter.schema.js';

const EDITABLE_FIELDS = [
  'apiUrl',
  'tokenUrl',
  'clientId',
  'clientSecret',
  'refreshToken',
  'instanceUrl',
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

// Change these to match the field names on your User schema
// (e.g. 'firstName lastName email' or 'username email').
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

  // Re-populate createdBy / updatedBy (needed after save() or create(),
  // because assigning an ObjectId replaces the populated document).
  private async populateAudit(
    doc: ProviderDocument,
  ): Promise<ProviderDocument> {
    await doc.populate(AUDIT_POPULATE);
    return doc;
  }

  private toAuditUser(user: unknown): AuditUserView | undefined {
    if (!user) return undefined;

    // Populated user document
    if (typeof user === 'object' && user !== null && 'name' in user) {
      const u = user as {
        _id: Types.ObjectId;
        name?: string;
        email?: string;
      };
      return { id: u._id.toString(), name: u.name, email: u.email };
    }

    // Populated, but user has no `name` field (different schema)
    if (typeof user === 'object' && user !== null && '_id' in user) {
      const u = user as { _id: Types.ObjectId; email?: string };
      return { id: u._id.toString(), email: u.email };
    }

    // Not populated (plain ObjectId)
    return { id: String(user) };
  }

  private toSetView(
    c: CredentialSet,
    withSecrets = false,
  ): CredentialSetView {
    return {
      mode: c.mode,
      apiUrl: c.apiUrl,
      tokenUrl: c.tokenUrl,
      clientId: c.clientId,
      ...(withSecrets
        ? { clientSecret: c.clientSecret, refreshToken: c.refreshToken }
        : {
          hasClientSecret: Boolean(c.clientSecret),
          hasRefreshToken: Boolean(c.refreshToken),
        }),
      instanceUrl: c.instanceUrl,
      updatedAt: c.updatedAt,
    };
  }

  // Returns real secret values. Use only for the protected credentials endpoint.
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
      logo: doc.logo,
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

    let userObjectId: Types.ObjectId;

    try {
      userObjectId = this.validateUserId(userId);
    } catch (error) {
      await this.cleanupUploadedFile(file);
      throw error;
    }

    const logo = `${LOGO_URL_PREFIX}/${file.filename}`;

    try {
      const modes = (dto.credentials ?? []).map((c) => c.mode);
      if (new Set(modes).size !== modes.length) {
        throw new BadRequestException('Each credentials mode can only be sent once');
      }

      const providerCode = await this.generateProviderCode();

      const doc = await this.providerModel.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        providerCode,
        logo,
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
      await this.cleanupUploadedFile(file);

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
      .select('providerCode name phone email isActive createdBy updatedBy')
      .populate(AUDIT_POPULATE)
      .sort({ createdAt: -1 })
      .exec();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      providerId: doc.providerCode,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
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
      .select('id providerCode name')
      .populate(AUDIT_POPULATE)
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
    let userObjectId: Types.ObjectId;

    try {
      userObjectId = this.validateUserId(userId);
    } catch (error) {
      await this.cleanupUploadedFile(file);
      throw error;
    }

    let doc: ProviderDocument;

    try {
      doc = await this.findWithCredentials(id);
    } catch (error) {
      await this.cleanupUploadedFile(file);
      throw error;
    }

    const oldLogo = doc.logo;

    if (dto.name !== undefined) {
      doc.name = dto.name;
    }

    if (dto.phone !== undefined) {
      doc.phone = dto.phone;
    }

    if (dto.email !== undefined) {
      doc.email = dto.email;
    }

    if (file) {
      doc.logo = `${LOGO_URL_PREFIX}/${file.filename}`;
    }

    // Keep createdBy unchanged; update only the last editor.
    doc.updatedBy = userObjectId;

    try {
      await doc.save();
    } catch (error) {
      await this.cleanupUploadedFile(file);

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A provider with this name or code already exists',
        );
      }

      throw error;
    }

    if (file) {
      await this.removeFile(oldLogo);
    }

    // updatedBy was replaced by a raw ObjectId, so populate again.
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

    await this.removeFile(doc.logo);

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
