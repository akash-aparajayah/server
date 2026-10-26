import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  UserSettings,
  UserSettingsDocument,
} from './schemas/user-settings.schema.js';
import {
  GatewayCredential,
  GatewayCredentialDocument,
} from './schemas/gateway-credential.schema.js';
import {
  ChangePasswordDto,
  SaveColumnsDto,
  SaveGatewayDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './dto/settings.dto.js';
import { COLUMN_REGISTRY, DEFAULT_PREFERENCES } from './settings.constants.js';
import { decrypt, encrypt } from '../../common/utils/crypto.util.js';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserSettings.name)
    private settingsModel: Model<UserSettingsDocument>,
    @InjectModel(GatewayCredential.name)
    private gatewayModel: Model<GatewayCredentialDocument>,
    private readonly config: ConfigService,
  ) {}

  // ================= Profile =================

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    return this.profileView(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // only name and phone can be changed here (role / email / password cannot)
    const set: Record<string, any> = {};
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.phone !== undefined) set.phone = dto.phone;

    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: set }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return this.profileView(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    (user as any).refreshTokenHash = null; // force login again on other devices
    await user.save();
    return { changed: true };
  }

  private profileView(user: UserDocument) {
    const u = user.toObject();
    const cdnUrl = process.env.ASSET_BASE_URL?.replace(/\/$/, '');

    return {
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      role: u.role,
      profileImageUrl:
        cdnUrl && u.profileImageKey ? `${cdnUrl}/${u.profileImageKey}` : null,
    };
  }

  // ================= Preferences =================

  async getPreferences(userId: string) {
    const doc = await this.settingsModel.findOne({ user: userId }).exec();
    const saved: Record<string, any> =
      (doc?.preferences as any)?.toObject?.() ?? doc?.preferences ?? {};
    return { ...DEFAULT_PREFERENCES, ...this.stripEmpty(saved) };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const set: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) set[`preferences.${k}`] = v;
    }
    if (Object.keys(set).length) {
      await this.settingsModel
        .updateOne({ user: userId }, { $set: set }, { upsert: true })
        .exec();
    }
    return this.getPreferences(userId);
  }

  private stripEmpty(obj: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
    );
  }

  // ================= Columns =================

  private assertTable(table: string) {
    if (!COLUMN_REGISTRY[table]) {
      throw new BadRequestException(
        `Unknown table "${table}". Allowed: ${Object.keys(COLUMN_REGISTRY).join(', ')}`,
      );
    }
  }

  // registry + user's saved layout merged
  async getColumns(userId: string, table: string) {
    this.assertTable(table);

    const doc = await this.settingsModel.findOne({ user: userId }).exec();
    const saved = doc?.columns?.find((c) => c.table === table)?.columns ?? [];
    const savedMap = new Map(saved.map((s) => [s.key, s]));

    const columns = COLUMN_REGISTRY[table]
      .map((def, i) => {
        const s = savedMap.get(def.key);
        return {
          key: def.key,
          label: def.label,
          locked: !!def.locked,
          visible: def.locked ? true : s ? s.visible : def.defaultVisible,
          order: s ? s.order : i,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      table,
      shown: columns.filter((c) => c.visible).length,
      total: columns.length,
      columns,
    };
  }

  async saveColumns(userId: string, table: string, dto: SaveColumnsDto) {
    this.assertTable(table);
    const registry = new Map(COLUMN_REGISTRY[table].map((d) => [d.key, d]));

    const keys = dto.columns.map((c) => c.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Duplicate column keys');
    }
    for (const c of dto.columns) {
      const def = registry.get(c.key);
      if (!def) throw new BadRequestException(`Unknown column "${c.key}"`);
      if (def.locked && !c.visible) {
        throw new BadRequestException(`Column "${c.key}" cannot be hidden`);
      }
    }

    const items = dto.columns.map((c, order) => ({
      key: c.key,
      visible: c.visible,
      order,
    }));

    // replace this table's layout (other tables stay as they are)
    await this.settingsModel
      .updateOne(
        { user: userId },
        { $pull: { columns: { table } } },
        { upsert: true },
      )
      .exec();
    await this.settingsModel
      .updateOne(
        { user: userId },
        { $push: { columns: { table, columns: items } } },
      )
      .exec();

    return this.getColumns(userId, table);
  }

  // "Reset" button
  async resetColumns(userId: string, table: string) {
    this.assertTable(table);
    await this.settingsModel
      .updateOne({ user: userId }, { $pull: { columns: { table } } })
      .exec();
    return this.getColumns(userId, table);
  }

  // ================= Payment gateway =================

  async getGateway(mode: string) {
    const cred = await this.gatewayModel.findOne({ mode }).exec();
    if (!cred)
      return { mode, configured: false, publishableKey: '', secretKey: '' };

    return {
      mode,
      configured: true,
      publishableKey: cred.publishableKey,
      secretKey: `••••••••${cred.secretLast4}`, // masked, real secret never leaves the server
      updatedAt: (cred as any).updatedAt,
    };
  }

  async saveGateway(mode: string, dto: SaveGatewayDto, userId: string) {
    const existing = await this.gatewayModel.findOne({ mode }).exec();
    if (!existing && !dto.secretKey) {
      throw new BadRequestException('secretKey is required');
    }

    const set: Record<string, any> = {
      publishableKey: dto.publishableKey,
      updatedBy: userId,
    };
    if (dto.secretKey) {
      const key = this.config.getOrThrow<string>('CREDENTIALS_ENCRYPTION_KEY');
      set.secretKeyEnc = encrypt(dto.secretKey, key);
      set.secretLast4 = dto.secretKey.slice(-4);
    }

    await this.gatewayModel
      .updateOne({ mode }, { $set: set }, { upsert: true, runValidators: true })
      .exec();
    return this.getGateway(mode);
  }

  // INTERNAL ONLY: decrypted secret for server-side Stripe calls.
  // Never return this from a controller.
  async getGatewaySecret(mode: 'sandbox' | 'live'): Promise<string> {
    const cred = await this.gatewayModel
      .findOne({ mode })
      .select('+secretKeyEnc')
      .exec();
    if (!cred?.secretKeyEnc) {
      throw new NotFoundException(
        `No ${mode} payment gateway credentials saved`,
      );
    }
    const key = this.config.getOrThrow<string>('CREDENTIALS_ENCRYPTION_KEY');
    return decrypt(cred.secretKeyEnc, key);
  }
}
