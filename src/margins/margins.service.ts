import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Margin, MarginDocument, MarkupType } from './schemas/margin.schema.js';
import { Bundle, BundleDocument } from '../bundles/schemas/bundle.schema.js';
import { CreateMarginDto } from './dto/create-margin.dto.js';
import { UpdateMarginDto } from './dto/update-margin.dto.js';
import { MarginQueryDto } from './dto/margin-query.dto.js';

const SORTABLE = [
  'wholesalePrice', 'retailPrice', 'markupAmount', 'markupPercent',
  'buyRate', 'marginVsRetail', 'createdAt', 'updatedAt',
];

const r = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class MarginsService {
  constructor(
    @InjectModel(Margin.name) private model: Model<MarginDocument>,
    @InjectModel(Bundle.name) private bundleModel: Model<BundleDocument>,
  ) {}

  private calculate(wholesale: number, retail: number, type: MarkupType, value: number) {
    const markupAmount = type === MarkupType.Flat ? r(value) : r((wholesale * value) / 100);
    const buyRate = r(wholesale + markupAmount);
    const markupPercent = wholesale > 0 ? r((markupAmount / wholesale) * 100) : 0;
    const marginVsRetail = r(retail - buyRate);
    return { markupAmount, markupPercent, buyRate, marginVsRetail };
  }

  private retailFrom(bundle: BundleDocument, fallback?: number) {
    const retail = bundle.sellingPrice ?? bundle.price ?? fallback;
    if (retail == null) {
      throw new BadRequestException('This product has no retail price. Send retailPrice.');
    }
    return retail;
  }

  async create(userId: string, dto: CreateMarginDto) {
    const bundle = await this.bundleModel.findById(dto.productId).exec();
    if (!bundle) throw new NotFoundException('Product not found');

    const retailPrice = this.retailFrom(bundle, dto.retailPrice);
    try {
      const doc = await this.model.create({
        product: dto.productId,
        wholesalePrice: dto.wholesalePrice,
        retailPrice,
        markupType: dto.markupType,
        markupValue: dto.markupValue,
        ...this.calculate(dto.wholesalePrice, retailPrice, dto.markupType, dto.markupValue),
        createdBy: userId,
        updatedBy: userId,
      });
      return doc;
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Margin already exists for this product');
      throw e;
    }
  }

  async findAll(q: MarginQueryDto) {
    const filter: Record<string, any> = {};
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const ids = await this.bundleModel.find({ name: rx }).distinct('_id');
      filter.product = { $in: ids };
    }

    const sortBy = SORTABLE.includes(q.sortBy) ? q.sortBy : 'createdAt';
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('product', 'name shortCode')
        .sort({ [sortBy]: q.order === 'asc' ? 1 : -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('product', 'name shortCode').exec();
    if (!doc) throw new NotFoundException('Margin not found');
    return doc;
  }

  async update(id: string, userId: string, dto: UpdateMarginDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Margin not found');

    // refresh retail from the product if it has a price, else keep / use the sent one
    const bundle = await this.bundleModel.findById(doc.product).exec();
    const retail = bundle?.sellingPrice ?? bundle?.price ?? dto.retailPrice ?? doc.retailPrice;

    doc.wholesalePrice = dto.wholesalePrice ?? doc.wholesalePrice;
    doc.markupType = dto.markupType ?? doc.markupType;
    doc.markupValue = dto.markupValue ?? doc.markupValue;
    doc.retailPrice = retail;
    Object.assign(
      doc,
      this.calculate(doc.wholesalePrice, doc.retailPrice, doc.markupType, doc.markupValue),
    );
    doc.updatedBy = new Types.ObjectId(userId);
    return doc.save();
  }
}