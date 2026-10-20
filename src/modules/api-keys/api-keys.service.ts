import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  ApiKey,
  ApiKeyDocument,
  ApiKeyType,
} from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto.js';
import type {
  ApiKeyCreateResponse,
  ApiKeyListResponse,
  ApiKeyRevokeResponse,
} from './interfaces/api-key-response.interface.js';
import type { ApiKeyContext } from '../../common/interfaces/api-key-context.interface.js';
import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';
import { sha256 } from '../../common/utils/hash.util.js';
import { SubEntitiesService } from '../sub-entities/sub-entities.service.js';

const KEY_PREFIX: Record<ApiKeyType, string> = {
  [ApiKeyType.LIVE]: 'cn_live_',
  [ApiKeyType.SANDBOX]: 'cn_sandBox_',
};
const LAST_USED_THROTTLE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly subEntity: SubEntitiesService,
  ) {}

  private generateKey(type: ApiKeyType): {
    rawKey: string;
    keyHash: string;
    prefix: string;
  } {
    const rawKey = KEY_PREFIX[type] + randomBytes(32).toString('base64url');
    return { rawKey, keyHash: sha256(rawKey), prefix: rawKey.slice(0, 12) };
  }

  private calcExpiry(expiresInDays?: number): Date | null {
    return expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS) : null;
  }

  // raw key is returned only once
  private toCreateResponse(
    doc: ApiKeyDocument,
    rawKey: string,
  ): ApiKeyCreateResponse {
    return {
      id: doc._id,
      subEntityId: doc.subEntityId,
      type: doc.type,
      note: doc.note,
      prefix: doc.prefix,
      expiresAt: doc.expiresAt,
      key: rawKey,
    };
  }

  async create(
    subEntityId: string,
    dto: CreateApiKeyDto,
    user: AuthUser,
  ): Promise<ApiKeyCreateResponse> {
    await this.subEntity.findOne(subEntityId, user); // owner check (404 / 403)

    const { rawKey, keyHash, prefix } = this.generateKey(dto.type);
    try {
      const doc = await this.apiKeyModel.create({
        subEntityId,
        type: dto.type,
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
          `A ${dto.type} key already exists for this sub entity. Use regenerate to replace it.`,
        );
      }
      throw e;
    }
  }

  async findByEntity(
    subEntityId: string,
    user: AuthUser,
  ): Promise<ApiKeyListResponse[]> {
    await this.subEntity.findOne(subEntityId, user);

    const keys = await this.apiKeyModel
      .find({ subEntityId })
      .select('_id subEntityId type note prefix expiresAt lastUsedAt isActive')
      .sort({ type: 1 })
      .lean()
      .exec();

    return keys.map((key) => ({
      id: key._id,
      subEntityId: key.subEntityId,
      type: key.type,
      note: key.note,
      prefix: key.prefix,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
    }));
  }

  // Overwrites the SAME document (active, expired or revoked). No new doc is created.

  async regenerate(
    id: string,
    dto: RegenerateApiKeyDto,
    user: AuthUser,
  ): Promise<ApiKeyCreateResponse> {
    const existing = await this.apiKeyModel.findById(id).exec();

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.subEntity.findOne(existing.subEntityId.toString(), user);

    if (!existing.isActive) {
      throw new ConflictException(
        'This API key has been revoked and cannot be regenerated.',
      );
    }

    const { rawKey, keyHash, prefix } = this.generateKey(existing.type);

    // Only update if the key is still active.
    // This prevents a concurrent revocation from being undone.
    const doc = await this.apiKeyModel
      .findOneAndUpdate(
        {
          _id: id,
          isActive: true,
        },
        {
          $set: {
            keyHash,
            prefix,
            note: dto.note ?? existing.note,
            expiresAt: this.calcExpiry(dto.expiresInDays),
            lastUsedAt: null,
            regeneratedBy: user.sub,
            regeneratedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!doc) {
      throw new ConflictException(
        'The API key was revoked or changed during regeneration. Please refresh and try again.',
      );
    }

    return this.toCreateResponse(doc, rawKey);
  }

  async revoke(id: string, user: AuthUser): Promise<ApiKeyRevokeResponse> {
    const key = await this.apiKeyModel.findById(id).exec();

    if (!key) {
      throw new NotFoundException('API key not found');
    }

    // Verify ownership before changing or returning the key's status.
    await this.subEntity.findOne(key.subEntityId.toString(), user);

    if (!key.isActive) {
      return { revoked: true };
    }

    const result = await this.apiKeyModel
      .updateOne({ _id: id, isActive: true }, { $set: { isActive: false } })
      .exec();

    if (result.matchedCount === 0) {
      const latest = await this.apiKeyModel.findById(id).exec();

      if (!latest) {
        throw new NotFoundException('API key not found');
      }

      if (!latest.isActive) {
        return { revoked: true };
      }

      throw new ConflictException(
        'The API key changed during revocation. Please try again.',
      );
    }

    return { revoked: true };
  }

  // ApiKeyGuard uses this (no logged-in user here, so never call findOne)
  async validate(rawKey: string): Promise<ApiKeyContext | null> {
    const key = await this.apiKeyModel
      .findOne({ keyHash: sha256(rawKey), isActive: true })
      .exec();
    if (!key) return null;

    if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    const entity = await this.subEntity.findActiveById(
      key.subEntityId.toString(),
    );
    if (!entity) return null; // sub entity deleted / inactive

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

    return {
      keyId: key._id.toString(),
      subEntityId: key.subEntityId.toString(),
      type: key.type,
    };
  }
}
