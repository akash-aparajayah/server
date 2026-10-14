import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EngineConfig,
  EngineConfigDocument,
} from './schemas/engine-config.schema.js';
import {
  CreateEngineConfigDto,
  SignalDto,
} from './dto/create-engine-config.dto.js';
import { UpdateEngineConfigDto } from './dto/update-engine-config.dto.js';
import { QueryEngineConfigDto } from './dto/query-engine-config.dto.js';

@Injectable()
export class ProductEngineConfigsService {
  constructor(
    @InjectModel(EngineConfig.name) private model: Model<EngineConfigDocument>,
  ) {}

  private assertThresholds(t?: {
    show: number;
    review: number;
    hide?: number;
  }) {
    if (!t) return;
    const hide = t.hide ?? 0;
    if (!(t.show >= t.review && t.review >= hide)) {
      throw new BadRequestException(
        'Thresholds must satisfy: show >= review >= hide',
      );
    }
  }

  private assertSignals(signals: SignalDto[] = []) {
    const ids = signals.map((s) => s.signalId.toLowerCase());
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Signal IDs must be unique within a config',
      );
    }
  }

  private dup(e: any): never {
    if (e?.code === 11000) {
      throw new ConflictException(
        'This provider already has a config with this name',
      );
    }
    throw e;
  }

  async create(dto: CreateEngineConfigDto, userId: string) {
    this.assertThresholds(dto.thresholds);
    this.assertSignals(dto.signals);
    try {
      return await this.model.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e) {
      this.dup(e);
    }
  }

  async findAll(q: QueryEngineConfigDto) {
    const filter: Record<string, any> = {};
    if (q.status) filter.status = q.status;
    if (q.providerId) filter.providerId = q.providerId;
    if (q.offerType) filter.offerType = q.offerType;
    if (q.search) {
      const safe = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .select('-signals') // list ku signals vendaam
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page: q.page, limit: q.limit };
  }

  async findOne(id: string) {
    const config = await this.model.findById(id).exec();
    if (!config) throw new NotFoundException('Engine configuration not found');
    return config;
  }

  async update(id: string, dto: UpdateEngineConfigDto, userId: string) {
    this.assertThresholds(dto.thresholds);
    try {
      const config = await this.model
        .findByIdAndUpdate(
          id,
          { ...dto, updatedBy: userId },
          { new: true, runValidators: true },
        )
        .exec();
      if (!config)
        throw new NotFoundException('Engine configuration not found');
      return config;
    } catch (e) {
      this.dup(e);
    }
  }

  // "Save Signals" button: signals-a muzhusa replace pannum
  async saveSignals(id: string, signals: SignalDto[], userId: string) {
    this.assertSignals(signals);
    const config = await this.model
      .findByIdAndUpdate(
        id,
        { signals, updatedBy: userId },
        { new: true, runValidators: true },
      )
      .exec();
    if (!config) throw new NotFoundException('Engine configuration not found');
    return config;
  }

  async remove(id: string) {
    const config = await this.model.findByIdAndDelete(id).exec();
    if (!config) throw new NotFoundException('Engine configuration not found');
    return { deleted: true };
  }
}
