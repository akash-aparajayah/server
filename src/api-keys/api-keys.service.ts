import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto.js';

const DAY_MS = 86_400_000;

@Injectable()
export class ApiKeysService {
  constructor(@InjectModel(ApiKey.name) private model: Model<ApiKeyDocument>) {}

  private generate() {
    const prefix = randomBytes(3).toString('hex'); // e.g. a3f9b2
    const key = `${prefix}_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    return { prefix, key, keyHash };
  }

  private expiry(days?: number) {
    return days ? new Date(Date.now() + days * DAY_MS) : null;
  }

  private safe(doc: ApiKeyDocument) {
    const { keyHash: _omit, ...rest } = doc.toObject();
    return rest;
  }

  /* -------- CREATE -------- */
  async create(userId: string, dto: CreateApiKeyDto) {
    const { prefix, key, keyHash } = this.generate();
    try {
      const doc = await this.model.create({
        projectId: dto.projectId,
        environmentId: dto.environmentId,
        note: dto.note,
        mode: dto.mode,
        keyHash,
        prefix,
        expiresInDays: dto.expiresInDays ?? null,
        expiresAt: this.expiry(dto.expiresInDays),
        createdBy: userId,
      });
      return { ...this.safe(doc), key }; // raw key shown only this once
    } catch (e: any) {
      if (e.code === 11000) throw new BadRequestException('API key already exists');
      throw e;
    }
  }

  /* -------- REGENERATE -------- */
  async regenerate(id: string, dto: RegenerateApiKeyDto) {
    const doc = await this.model.findOne({ _id: id, isDeleted: false }).exec();
    if (!doc) throw new NotFoundException('API key not found');

    const { prefix, key, keyHash } = this.generate();
    doc.keyHash = keyHash;
    doc.prefix = prefix;
    if (dto.note !== undefined) doc.note = dto.note;
    doc.expiresInDays = dto.expiresInDays ?? null;
    doc.expiresAt = this.expiry(dto.expiresInDays);
    doc.lastUsedAt = null;
    doc.isActive = true;

    try {
      await doc.save();
    } catch (e: any) {
      if (e.code === 11000) throw new BadRequestException('An active key already exists');
      throw e;
    }
    return { ...this.safe(doc), key };
  }

  /* -------- LIST -------- */
  findAll(projectId?: string) {
    return this.model
      .find({ isDeleted: false, ...(projectId ? { projectId } : {}) })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  /* -------- DELETE (soft) -------- */
  async remove(id: string) {
    const doc = await this.model
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true, isActive: false })
      .exec();
    if (!doc) throw new NotFoundException('API key not found');
    return { deleted: true };
  }

  /* -------- VALIDATE (used by ApiKeyGuard) -------- */
  async validate(rawKey: string) {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const doc = await this.model
      .findOne({ keyHash, isActive: true, isDeleted: false })
      .select('-keyHash')
      .exec();

    if (!doc) throw new UnauthorizedException('Invalid API key');
    if (doc.expiresAt && doc.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('API key expired');
    }

    this.model.updateOne({ _id: doc._id }, { lastUsedAt: new Date() }).exec().catch(() => {});
    return doc;
  }
}