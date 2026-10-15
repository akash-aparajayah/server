import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument, ProductStatus, PublishMode } from './schemas/product.schema.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { CategoriesService } from '../categories/categories.service.js';
import { BundlesService } from '../bundles/bundles.service.js';
import { DiscountType } from '../../common/enums/discount-type.enum.js';
import { sanitizeRichText } from '../../common/utils/sanitize.util.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly categories: CategoriesService,
    private readonly bundles: BundlesService,
  ) {}

  // ---------- helpers ----------

  private assertPricing(p: { retailPrice?: number; discountType?: DiscountType; discountValue?: number | null }) {
    const hasType = !!p.discountType;
    const hasValue = p.discountValue != null;
    if (hasType !== hasValue) {
      throw new BadRequestException('discountType and discountValue must be given together');
    }
    if (p.discountType === DiscountType.Percentage && p.discountValue! > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
    if (p.discountType === DiscountType.Fixed && p.retailPrice != null && p.discountValue! > p.retailPrice) {
      throw new BadRequestException('Discount cannot be more than the retail price');
    }
  }

  private async assertRefs(category?: string, bundled?: string[]) {
    if (category) await this.categories.findOne(category); // 404 if missing
    if (bundled?.length) await Promise.all(bundled.map((id) => this.bundles.findOne(id)));
  }

  private cleanContent(dto: { marketplace?: any }) {
    const m = dto.marketplace;
    if (m?.longDescription) m.longDescription = sanitizeRichText(m.longDescription);
    if (m?.pricingRenewalContent) m.pricingRenewalContent = sanitizeRichText(m.pricingRenewalContent);
  }

  // Publish munnadi ellaa required fields-um irukkanum
  private assertPublishable(p: ProductDocument) {
    const missing: string[] = [];
    if (!p.providerId) missing.push('providerId');
    if (!p.marketplace?.shortDescription) missing.push('marketplace.shortDescription');
    if (!p.marketplace?.longDescription) missing.push('marketplace.longDescription');
    if (!p.marketplace?.pricingRenewalContent) missing.push('marketplace.pricingRenewalContent');
    if (!p.dashboard?.template) missing.push('dashboard.template');
    if (!p.dashboard?.title) missing.push('dashboard.title');
    if (!p.dashboard?.callToAction) missing.push('dashboard.callToAction');
    if (!p.dashboard?.featureTitle) missing.push('dashboard.featureTitle');
    if (!p.dashboard?.shortDescription) missing.push('dashboard.shortDescription');
    if (p.retailPrice == null) missing.push('retailPrice');
    if (!p.placements?.length) missing.push('placements');
    if (!p.perUserFrequencyCap) missing.push('perUserFrequencyCap');
    if (!p.publishMode) missing.push('publishMode');
    if (p.publishMode === PublishMode.Scheduled && !p.scheduledAt) missing.push('scheduledAt');

    if (missing.length) {
      throw new BadRequestException({ message: 'Complete these fields before publishing', missing });
    }
    if (p.scheduledAt && p.expiresAt && p.expiresAt <= p.scheduledAt) {
      throw new BadRequestException('expiresAt must be after scheduledAt');
    }
    if (p.expiresAt && p.expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
  }

  // ---------- CRUD ----------

  async create(dto: CreateProductDto, userId: string) {
    this.assertPricing(dto);
    await this.assertRefs(dto.category, dto.bundled);
    this.cleanContent(dto);

    try {
      return await this.productModel.create({
        ...dto,
        status: ProductStatus.Draft, // client status set panna koodathu
        createdBy: userId,
        updatedBy: userId,
      });
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Product name already exists');
      throw e;
    }
  }

  async findAll(q: QueryProductDto) {
    const filter: Record<string, any> = {};
    if (q.status) filter.status = q.status;
    if (q.category) filter.category = q.category;
    if (q.search) {
      const safe = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name')
        .populate('bundled', 'name shortCode')
        .populate('engineconfig', 'name')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return { items, total, page: q.page, limit: q.limit };
  }

  // MarginsService idhaiyum use pannum (product irukka nu check ku)
  async findOne(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name')
      .populate('bundled', 'name shortCode')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const current = await this.productModel.findById(id).exec();
    if (!current) throw new NotFoundException('Product not found');

    this.assertPricing({
      retailPrice: dto.retailPrice ?? current.retailPrice,
      discountType: dto.discountType ?? current.discountType,
      discountValue: dto.discountValue ?? current.discountValue,
    });
    await this.assertRefs(dto.category, dto.bundled);
    this.cleanContent(dto);

    // marketplace / dashboard: oru tab save pannina mathadhu tab data azhiyaadhu
    const { marketplace, dashboard, ...rest } = dto;
    const set: Record<string, any> = { ...rest, updatedBy: userId };
    for (const [k, v] of Object.entries(marketplace ?? {})) set[`marketplace.${k}`] = v;
    for (const [k, v] of Object.entries(dashboard ?? {})) set[`dashboard.${k}`] = v;

    try {
      const product = await this.productModel
        .findByIdAndUpdate(id, { $set: set }, { returnDocument: 'after', runValidators: true })
        .exec();
      return product;
    } catch (e: any) {
      if (e.code === 11000) throw new ConflictException('Product name already exists');
      throw e;
    }
  }

  async publish(id: string, userId: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');

    this.assertPublishable(product);

    const goesLater =
      product.publishMode === PublishMode.Scheduled &&
      product.scheduledAt &&
      product.scheduledAt > new Date();

    product.status = goesLater ? ProductStatus.Scheduled : ProductStatus.Active;
    product.updatedBy = userId as any;
    return product.save();
  }

  async remove(id: string) {
    const product = await this.productModel.findByIdAndDelete(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return { deleted: true };
  }
}