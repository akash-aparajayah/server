import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { AuthUser, InstancesService } from '../instances/instances.service.js';
import { sha256 } from '../../common/utils/hash.util.js';

const KEY_PREFIX = 'rk_live_';
const LAST_USED_THROTTLE_MS = 60_000; // 1 min ku oru thadava mattum write
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly instances: InstancesService,
  ) {}

  // ---------- helpers ----------

  private generateKey() {
    const rawKey = KEY_PREFIX + randomBytes(32).toString('base64url');
    return {
      rawKey,
      keyHash: sha256(rawKey),
      prefix: rawKey.slice(0, 12),
    };
  }

  private calcExpiry(expiresInDays?: number) {
    return expiresInDays ? new Date(Date.now() + expiresInDays * DAY_MS) : null;
  }

  // raw key response la oru thadava mattum varum
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

  // ---------- "Create token" button ----------

  async create(instanceId: string, dto: CreateApiKeyDto, user: AuthUser) {
    await this.instances.findOne(instanceId, user); // owner check (404 / 403)

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
      return this.toCreateResponse(doc, rawKey);
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException(
          'This instance already has an active key. Revoke or regenerate it.',
        );
      }
      throw e;
    }
  }

  // ---------- list (keyHash select:false, so varaadhu) ----------

  async findByInstance(instanceId: string, user: AuthUser) {
    await this.instances.findOne(instanceId, user); // owner check
    return this.apiKeyModel.find({ instanceId }).sort({ createdAt: -1 }).exec();
  }

  // ---------- "Regenerate" button ----------

  async regenerate(id: string, dto: CreateApiKeyDto, user: AuthUser) {
    const old = await this.apiKeyModel.findById(id).exec();
    if (!old) throw new NotFoundException('API key not found');

    await this.instances.findOne(old.instanceId.toString(), user); // owner check

    if (!old.isActive) {
      throw new ConflictException(
        'This key is already revoked. Create a new one instead.',
      );
    }

    // pazhaya key first revoke (partial unique index free aaganum)
    old.isActive = false;
    await old.save();

    const { rawKey, keyHash, prefix } = this.generateKey();

    try {
      const doc = await this.apiKeyModel.create({
        instanceId: old.instanceId,
        note: dto.note ?? old.note, // note anuppala na pazhaya note keep
        keyHash,
        prefix,
        expiresAt: this.calcExpiry(dto.expiresInDays),
        createdBy: user.sub,
      });
      return this.toCreateResponse(doc, rawKey);
    } catch (e) {
      // create fail aana pazhaya key thirumba active
      old.isActive = true;
      await old.save();
      throw e;
    }
  }

  // ---------- revoke ----------

  async revoke(id: string, user: AuthUser) {
    const key = await this.apiKeyModel.findById(id).exec();
    if (!key) throw new NotFoundException('API key not found');

    await this.instances.findOne(key.instanceId.toString(), user); // owner check

    key.isActive = false;
    await key.save();
    return { revoked: true };
  }

  // ---------- ApiKeyGuard use pannum ----------

  async validate(rawKey: string) {
    const key = await this.apiKeyModel
      .findOne({ keyHash: sha256(rawKey), isActive: true })
      .exec();
    if (!key) return null;

    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) return null;

    const instance = await this.instances.findActiveById(
      key.instanceId.toString(),
    );
    if (!instance) return null; // instance delete / inactive na key work aagadhu

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
      instanceId: key.instanceId.toString(),
    };
  }
}
