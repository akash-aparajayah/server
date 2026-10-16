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
  WeightType,
} from './schemas/engine-config.schema.js';

import {
  CreateEngineConfigDto,
  SignalDto,
} from './dto/create-engine-config.dto.js';

import { UpdateEngineConfigDto } from './dto/update-engine-config.dto.js';
import { QueryEngineConfigDto } from './dto/query-engine-config.dto.js';

// Fields that contain numeric values
const NUMERIC_FIELDS = [
  'weightValue',
  'cap',
  'divisor',
  'multiplier',
  'reference',
  'trigger',
] as const;

type NumericField = (typeof NUMERIC_FIELDS)[number];

// Numeric fields required by each weight type
const FIELDS_BY_TYPE: Record<WeightType, NumericField[]> = {
  [WeightType.Flat]: ['weightValue'],
  [WeightType.Percentage]: ['weightValue'],
  [WeightType.Saturating]: ['cap', 'divisor'],
  [WeightType.Ratio]: ['multiplier', 'reference', 'divisor', 'cap'],
  [WeightType.Balance]: ['reference', 'cap', 'multiplier', 'trigger'],
};

export interface PaginatedEngineConfigsResponse {
  data: EngineConfigDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductEngineConfigsService {
  constructor(
    @InjectModel(EngineConfig.name)
    private readonly model: Model<EngineConfigDocument>,
  ) {}

  // ---------- Helpers ----------

  // Validate threshold order
  private assertThresholds(thresholds?: {
    show: number;
    review: number;
    hide?: number;
  }): void {
    if (!thresholds) return;

    const hide = thresholds.hide ?? 0;

    if (!(thresholds.show >= thresholds.review && thresholds.review >= hide)) {
      throw new BadRequestException(
        'Thresholds must satisfy: show >= review >= hide',
      );
    }
  }

  // Validate signals, enforce unique IDs, and remove unused fields
  private prepareSignals(signals: SignalDto[] = []): SignalDto[] {
    const ids = signals.map((signal) => signal.signalId.trim().toLowerCase());

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Signal IDs must be unique within a config',
      );
    }

    return signals.map((signal) => {
      const used = FIELDS_BY_TYPE[signal.weightType];

      if (!used) {
        throw new BadRequestException(
          `Invalid weight type for signal "${signal.signalId}"`,
        );
      }

      const missing = used.filter((field) => signal[field] == null);

      if (missing.length > 0) {
        throw new BadRequestException(
          `Signal "${signal.signalId}" (${signal.weightType}) requires: ${missing.join(', ')}`,
        );
      }

      if (used.includes('divisor') && signal.divisor === 0) {
        throw new BadRequestException(
          `Signal "${signal.signalId}": divisor cannot be 0`,
        );
      }

      const cleaned: SignalDto = { ...signal };

      for (const field of NUMERIC_FIELDS) {
        if (!used.includes(field)) {
          delete cleaned[field];
        }
      }

      return cleaned;
    });
  }

  // Convert MongoDB duplicate-key errors into a useful API error
  private handleDuplicateError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException(
        'This provider already has a config with this name',
      );
    }

    throw error;
  }

  // ---------- Create ----------

  async create(
    dto: CreateEngineConfigDto,
    userId: string,
  ): Promise<EngineConfigDocument> {
    this.assertThresholds(dto.thresholds);

    const signals = this.prepareSignals(dto.signals);

    try {
      return await this.model.create({
        ...dto,
        signals,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (error: unknown) {
      return this.handleDuplicateError(error);
    }
  }

  // ---------- Find All: Pagination + Search ----------

  async findAllConfigs(
    query: QueryEngineConfigDto,
  ): Promise<PaginatedEngineConfigsResponse> {
    // Validate page and limit
    const requestedPage = Number(query.page);
    const requestedLimit = Number(query.limit);

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 10;

    // Return active configurations only
    const filter: Record<string, any> = {
      status: true,
    };

    if (query.providerId) {
      filter.providerId = query.providerId;
    }

    if (query.offerType) {
      filter.offerType = query.offerType;
    }

    // Search configuration name, provider ID, and offer type
    const search = query.search?.trim();

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        {
          providerId: {
            $regex: safeSearch,
            $options: 'i',
          },
        },
        {
          offerType: {
            $regex: safeSearch,
            $options: 'i',
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch the page and matching total count concurrently
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .select('-signals')
        .sort({ _id: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),

      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------- Find One ----------

  async findOneConfigs(id: string): Promise<EngineConfigDocument> {
    const config = await this.model
      .findOne({
        _id: id,
        status: true,
      })
      .exec();

    if (!config) {
      throw new NotFoundException('Engine configuration not found');
    }

    return config;
  }

  // ---------- Update ----------

  async updateConfigs(
    id: string,
    dto: UpdateEngineConfigDto,
    userId: string,
  ): Promise<EngineConfigDocument> {
    this.assertThresholds(dto.thresholds);

    const dtoWithSignals = dto as UpdateEngineConfigDto & {
      signals?: SignalDto[];
    };

    // Validate and clean signals if they are included in the update
    const updateData: Record<string, any> = {
      ...dto,
      updatedBy: userId,
    };

    if (dtoWithSignals.signals !== undefined) {
      updateData.signals = this.prepareSignals(dtoWithSignals.signals);
    }

    try {
      const config = await this.model
        .findOneAndUpdate(
          {
            _id: id,
            status: true,
          },
          updateData,
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!config) {
        throw new NotFoundException('Engine configuration not found');
      }

      return config;
    } catch (error: unknown) {
      return this.handleDuplicateError(error);
    }
  }

  // ---------- Save Signals ----------

  async saveSignals(
    id: string,
    signals: SignalDto[],
    userId: string,
  ): Promise<EngineConfigDocument> {
    const preparedSignals = this.prepareSignals(signals);

    const config = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: true,
        },
        {
          signals: preparedSignals,
          updatedBy: userId,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!config) {
      throw new NotFoundException('Engine configuration not found');
    }

    return config;
  }

  // ---------- Soft Delete ----------

  async removeConfigs(id: string): Promise<{ deleted: boolean }> {
    const config = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: true,
        },
        {
          status: false,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!config) {
      throw new NotFoundException(
        'Engine configuration not found or already deleted',
      );
    }

    return { deleted: true };
  }
}
