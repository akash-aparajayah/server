import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'node:crypto';

import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { AuthUser, InstancesService } from '../instances/instances.service.js';
import { sha256 } from '../../common/utils/hash.util.js';

const KEY_PREFIX = 'fnt_live_';
const SECRET_BYTES = 32;
const LAST_USED_THROTTLE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly instances: InstancesService,
  ) {}

  // ---------- Generate secure API key ----------

  private generateKey() {
    const secret = randomBytes(SECRET_BYTES).toString('base64url');
    const rawKey = `${KEY_PREFIX}${secret}`;

    return {
      rawKey,
      keyHash: sha256(rawKey),
      prefix: rawKey.slice(0, KEY_PREFIX.length + 8),
    };
  }

  // ---------- Calculate expiry ----------

  private calcExpiry(expiresInDays?: number): Date | null {
    if (expiresInDays == null) {
      return null;
    }

    return new Date(Date.now() + expiresInDays * DAY_MS);
  }

  // ---------- Format create response ----------

  private toCreateResponse(doc: ApiKeyDocument, rawKey: string) {
    return {
      id: doc._id,
      instanceId: doc.instanceId,
      note: doc.note,
      prefix: doc.prefix,
      expiresAt: doc.expiresAt,
      key: rawKey,
    };
  }

  // ---------- Check MongoDB duplicate error ----------

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }

  // ---------- Create API key ----------

  async create(instanceId: string, dto: CreateApiKeyDto, user: AuthUser) {
    // Verify that the current user owns the instance.
    await this.instances.findOne(instanceId, user);

    const { rawKey, keyHash, prefix } = this.generateKey();

    try {
      const doc = await this.apiKeyModel.create({
        instanceId,
        note: dto.note,
        keyHash,
        prefix,
        expiresAt: this.calcExpiry(dto.expiresInDays),
        createdBy: user.sub,
      });

      // The raw key is returned only once.
      return this.toCreateResponse(doc, rawKey);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An active API key already exists for this instance. Revoke it before creating another.',
        );
      }

      throw error;
    }
  }

  // ---------- List API keys ----------

  async findByInstance(instanceId: string, user: AuthUser) {
    await this.instances.findOne(instanceId, user);

    return this.apiKeyModel
      .find({ instanceId })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  // ---------- Regenerate API key ----------

  async regenerate(id: string, dto: CreateApiKeyDto, user: AuthUser) {
    const oldKey = await this.apiKeyModel.findById(id).exec();

    if (!oldKey) {
      throw new NotFoundException('API key not found');
    }

    await this.instances.findOne(oldKey.instanceId.toString(), user);

    if (!oldKey.isActive) {
      throw new ConflictException(
        'This API key has already been revoked. Create a new key instead.',
      );
    }

    const { rawKey, keyHash, prefix } = this.generateKey();

    // Revoke the old key before creating its replacement.
    oldKey.isActive = false;
    await oldKey.save();

    try {
      const newKey = await this.apiKeyModel.create({
        instanceId: oldKey.instanceId,
        note: dto.note ?? oldKey.note,
        keyHash,
        prefix,
        expiresAt: this.calcExpiry(dto.expiresInDays),
        createdBy: user.sub,
      });

      return this.toCreateResponse(newKey, rawKey);
    } catch (error: unknown) {
      // Restore the old key if replacement creation fails.
      oldKey.isActive = true;
      await oldKey.save();

      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An active API key already exists for this instance.',
        );
      }

      throw error;
    }
  }

  // ---------- Revoke API key ----------

  async revoke(id: string, user: AuthUser) {
    const key = await this.apiKeyModel.findById(id).exec();

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    await this.instances.findOne(key.instanceId.toString(), user);

    if (!key.isActive) {
      return { revoked: true };
    }

    key.isActive = false;
    await key.save();

    return { revoked: true };
  }

  // ---------- Validate API key (ApiKeyGuard) ----------

  async validate(rawKey: string) {
    if (typeof rawKey !== 'string' || !rawKey.startsWith(KEY_PREFIX)) {
      return null;
    }

    const key = await this.apiKeyModel
      .findOne({
        keyHash: sha256(rawKey),
        isActive: true,
      })
      .exec();

    if (!key) {
      return null;
    }

    // Reject expired keys.
    if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    // Reject keys belonging to inactive or deleted instances.
    const instance = await this.instances.findActiveById(
      key.instanceId.toString(),
    );

    if (!instance) {
      return null;
    }

    // Update lastUsedAt at most once per minute.
    const threshold = new Date(Date.now() - LAST_USED_THROTTLE_MS);

    await this.apiKeyModel
      .updateOne(
        {
          _id: key._id,
          $or: [
            { lastUsedAt: null },
            { lastUsedAt: { $exists: false } },
            { lastUsedAt: { $lt: threshold } },
          ],
        },
        {
          $set: { lastUsedAt: new Date() },
        },
      )
      .exec();

    return {
      keyId: key._id.toString(),
      instanceId: key.instanceId.toString(),
    };
  }
}
