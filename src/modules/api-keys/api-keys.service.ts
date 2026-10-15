import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { EntitiesService } from '../entities/entities.service.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { sha256 } from '../../common/utils/hash.util.js';

const KEY_PREFIX = 'rk_live_';
const LAST_USED_THROTTLE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly entities: EntitiesService,
  ) {}

  private generateKey() {
    const rawKey = KEY_PREFIX + randomBytes(32).toString('base64url');
    return { rawKey, keyHash: sha256(rawKey), prefix: rawKey.slice(0, 12) };
  }

  private calcExpiry(expiresInDays?: number) {
    return expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS) : null;
  }

  // raw key is returned only once
  private toCreateResponse(doc: ApiKeyDocument, rawKey: string) {
    return {
      id: doc._id,
      entityId: doc.entityId,
      note: doc.note,
      prefix: doc.prefix,
      expiresAt: doc.expiresAt,
      key: rawKey,
    };
  }

  async create(entityId: string, dto: CreateApiKeyDto, user: AuthUser) {
    await this.entities.findOne(entityId, user); // owner check (404 / 403)

    const { rawKey, keyHash, prefix } = this.generateKey();
    try {
      const doc = await this.apiKeyModel.create({
        entityId,
        note: dto.note,
        keyHash,
        prefix,
        expiresAt: this.calcExpiry(dto.expiresInDays),
        createdBy: user.sub,
      });
      return this.toCreateResponse(doc, rawKey);
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException(
          'This entity already has an active key. Revoke or regenerate it.',
        );
      }
      throw e;
    }
  }

  async findByEntity(entityId: string, user: AuthUser) {
    await this.entities.findOne(entityId, user);
    return this.apiKeyModel.find({ entityId }).sort({ createdAt: -1 }).exec();
  }

  async regenerate(id: string, dto: CreateApiKeyDto, user: AuthUser) {
    const old = await this.apiKeyModel.findById(id).exec();
    if (!old) throw new NotFoundException('API key not found');

    await this.entities.findOne(old.entityId.toString(), user);

    if (!old.isActive) {
      throw new ConflictException('This key is already revoked. Create a new one instead.');
    }

    old.isActive = false;
    await old.save();

    const { rawKey, keyHash, prefix } = this.generateKey();
    try {
      const doc = await this.apiKeyModel.create({
        entityId: old.entityId,
        note: dto.note ?? old.note,
        keyHash,
        prefix,
        expiresAt: this.calcExpiry(dto.expiresInDays),
        createdBy: user.sub,
      });
      return this.toCreateResponse(doc, rawKey);
    } catch (e) {
      old.isActive = true; // rollback
      await old.save();
      throw e;
    }
  }

  async revoke(id: string, user: AuthUser) {
    const key = await this.apiKeyModel.findById(id).exec();
    if (!key) throw new NotFoundException('API key not found');

    await this.entities.findOne(key.entityId.toString(), user);

    key.isActive = false;
    await key.save();
    return { revoked: true };
  }

  // ApiKeyGuard uses this
  async validate(rawKey: string) {
    const key = await this.apiKeyModel
      .findOne({ keyHash: sha256(rawKey), isActive: true })
      .exec();
    if (!key) return null;

    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;

    const entity = await this.entities.findActiveById(key.entityId.toString());
    if (!entity) return null; // entity deleted / inactive

    const threshold = new Date(Date.now() - LAST_USED_THROTTLE_MS);
    await this.apiKeyModel
      .updateOne(
        {
          _id: key._id,
          $or: [{ lastUsedAt: null }, { lastUsedAt: { $lt: threshold } }],
        },
        { lastUsedAt: new Date() },
      )
      .exec();

    return { keyId: key._id.toString(), entityId: key.entityId.toString() };
  }
}