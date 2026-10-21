import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProductSignal,
  ProductSignalDocument,
} from './schemas/signal.schema.js';
import { WeightType } from '../product-engine-configs/schemas/engine-config.schema.js';
import { CreateSignalDto } from './dto/create-signal.dto.js';
import { UpdateSignalDto } from './dto/update-signal.dto.js';
import { QuerySignalDto } from './dto/query-signal.dto.js';

const NUMERIC_FIELDS = [
  'weightValue',
  'cap',
  'divisor',
  'multiplier',
  'reference',
  'trigger',
] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

// required: must be given, optional: kept if given, rest are cleared
const WEIGHT_RULES: Record<
  WeightType,
  { required: NumericField[]; optional: NumericField[] }
> = {
  [WeightType.Flat]: { required: ['weightValue'], optional: [] },
  [WeightType.Percentage]: { required: ['weightValue'], optional: [] },
  [WeightType.Saturating]: { required: ['cap', 'divisor'], optional: [] },
  [WeightType.Ratio]: {
    required: ['cap', 'multiplier'],
    optional: ['reference', 'divisor'],
  },
  [WeightType.Balance]: {
    required: ['reference', 'cap', 'multiplier', 'trigger'],
    optional: [],
  },
};

type WeightInput = { weightType: WeightType } & Partial<
  Record<NumericField, number | null>
>;

type WeightOutput = Partial<Record<NumericField, number | undefined>>;

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class SignalsService {
  constructor(
    @InjectModel(ProductSignal.name)
    private model: Model<ProductSignalDocument>,
  ) {}

  // ---------- helpers ----------

  // validates weight fields, returns all numeric fields (unused ones = undefined)
  private prepareWeight(w: WeightInput, signalId: string): WeightOutput {
    const rule = WEIGHT_RULES[w.weightType];
    const keep = [...rule.required, ...rule.optional];

    const missing = rule.required.filter((f) => w[f] == null);
    if (missing.length) {
      throw new BadRequestException(
        `Signal "${signalId}" (${w.weightType}) requires: ${missing.join(', ')}`,
      );
    }
    if (w.divisor === 0 && keep.includes('divisor')) {
      throw new BadRequestException('divisor cannot be 0');
    }

    const out: WeightOutput = {};
    for (const f of NUMERIC_FIELDS) {
      out[f] = keep.includes(f) ? (w[f] as number) : undefined;
    }
    return out;
  }

  private async assertSameAs(
    sameAs: string | undefined,
    selfId: string,
  ): Promise<void> {
    if (!sameAs) return;
    const ref = sameAs.toLowerCase();
    if (ref === selfId) {
      throw new BadRequestException('sameAs cannot point to the same signal');
    }
    const exists = await this.model.exists({ signalId: ref, isDeleted: false });
    if (!exists) {
      throw new BadRequestException(`sameAs signal "${ref}" does not exist`);
    }
  }

  // ---------- CRUD ----------

  async create(
    dto: CreateSignalDto,
    userId: string,
  ): Promise<ProductSignalDocument> {
    const signalId = dto.signalId.toLowerCase();
    const weight = this.prepareWeight(dto, signalId);
    await this.assertSameAs(dto.match?.sameAs, signalId);

    try {
      return await this.model.create({
        ...dto,
        signalId,
        ...weight,
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000) {
        throw new ConflictException('Signal ID already exists');
      }
      throw e;
    }
  }

  async findAll(q: QuerySignalDto): Promise<Page<ProductSignalDocument>> {
    const filter: Record<string, any> = { isDeleted: false };
    if (q.isActive !== undefined) filter.isActive = q.isActive;
    if (q.search) {
      const safe = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { signalId: { $regex: safe, $options: 'i' } },
        { label: { $regex: safe, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }

  // "Select Signal" dropdown in Engine Config: active, not deleted, no pagination
  options(): Promise<ProductSignalDocument[]> {
    return this.model
      .find({ isActive: true, isDeleted: false })
      .sort({ label: 1 })
      .limit(500)
      .exec();
  }

  async findOne(id: string): Promise<ProductSignalDocument> {
    const signal = await this.model
      .findOne({ _id: id, isDeleted: false })
      .exec();
    if (!signal) throw new NotFoundException('Signal not found');
    return signal;
  }

  async update(
    id: string,
    dto: UpdateSignalDto,
    userId: string,
  ): Promise<ProductSignalDocument> {
    const current = await this.findOne(id);

    // old values + new values merged, then validated again
    const merged: WeightInput = {
      weightType: dto.weightType ?? current.weightType,
      weightValue: dto.weightValue ?? current.weightValue,
      cap: dto.cap ?? current.cap,
      divisor: dto.divisor ?? current.divisor,
      multiplier: dto.multiplier ?? current.multiplier,
      reference: dto.reference ?? current.reference,
      trigger: dto.trigger ?? current.trigger,
    };
    const weight = this.prepareWeight(merged, current.signalId);
    await this.assertSameAs(dto.match?.sameAs, current.signalId);

    // weight fields already handled above, so remove them from the rest
    const rest: Record<string, any> = { ...dto };
    for (const key of ['weightType', ...NUMERIC_FIELDS]) delete rest[key];

    Object.assign(current, rest, { weightType: merged.weightType }, weight, {
      updatedBy: userId,
    });
    return current.save();
  }

  // soft delete: record stays in DB, hidden from every read
  async remove(id: string, userId: string): Promise<{ deleted: boolean }> {
    const signal = await this.findOne(id);

    // block if a non-deleted signal still uses this one in sameAs
    const used = await this.model.exists({
      'match.sameAs': signal.signalId,
      isDeleted: false,
    });
    if (used) {
      throw new ConflictException(
        'Another signal uses this one in "sameAs". Change that first.',
      );
    }

    signal.isDeleted = true;
    signal.isActive = false;
    signal.deletedAt = new Date();
    signal.updatedBy = new Types.ObjectId(userId);
    await signal.save();
    return { deleted: true };
  }
}
