import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bundle, BundleDocument, PricingType } from './schemas/bundle.schema.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { BundleQueryDto } from './dto/bundle-query.dto.js';

const SORTABLE = ['name', 'pricingType', 'price', 'status', 'createdAt', 'updatedAt'];

@Injectable()
export class BundlesService {
  constructor(@InjectModel(Bundle.name) private model: Model<BundleDocument>) {}

  // price/discount only apply to add-ons; bundles have no price
  private pricing(type: PricingType, price?: number, discount?: number) {
    if (type !== PricingType.AddOn || price == null) {
      return { price: undefined, discount: undefined, sellingPrice: undefined };
    }
    const d = discount ?? 0;
    return { price, discount: d, sellingPrice: +(price - (price * d) / 100).toFixed(2) };
  }

  async create(userId: string, dto: CreateBundleDto) {
    try {
      return await this.model.create({
        ...dto,
        ...this.pricing(dto.pricingType, dto.price, dto.discount),
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Short code already exists');
      throw e;
    }
  }

  async findAll(q: BundleQueryDto) {
    const filter: Record<string, any> = {};
    if (q.search) {
      const rx = { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      filter.$or = [{ name: rx }, { shortCode: rx }];
    }
    if (q.status) filter.status = q.status;
    if (q.pricingType) filter.pricingType = q.pricingType;

    const sortBy = SORTABLE.includes(q.sortBy) ? q.sortBy : 'createdAt';
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .select('-longDescription') // keep the list light
        .populate('createdBy updatedBy', 'name')
        .sort({ [sortBy]: q.order === 'asc' ? 1 : -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) };
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('createdBy updatedBy', 'name').exec();
    if (!doc) throw new NotFoundException('Bundle not found');
    return doc;
  }

  async update(id: string, userId: string, dto: UpdateBundleDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Bundle not found');

    Object.assign(doc, dto);
    Object.assign(doc, this.pricing(doc.pricingType, doc.price, doc.discount));
    doc.updatedBy = new Types.ObjectId(userId);

    try {
      return await doc.save();
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Short code already exists');
      throw e;
    }
  }
}