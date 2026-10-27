import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Product,
  ProductDocument,
  ProductStatus,
  PublishMode,
  MarkupType,
  AudienceType,
} from './schemas/product.schema.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';

import { CategoriesService } from '../categories/categories.service.js';
import { BundlesService } from '../bundles/bundles.service.js';
import { S3Service } from '../uploads/s3.service.js';

import { DiscountType } from '../../common/enums/discount-type.enum.js';
import { sanitizeRichText } from '../../common/utils/sanitize.util.js';

import type { Express } from 'express';

export type ProductFiles = {
  termsUrl?: Express.Multer.File[];
  imageUrl?: Express.Multer.File[];
};

export type PaginatedProductsResponse = {
  items: ProductDocument[];
  total: number;
  page: number;
  limit: number;
};

type MarginCalculationInput = {
  wholesalePrice?: number;
  markupType?: MarkupType;
  markupValue?: number;
  retailPrice?: number;
};

type MarginCalculationResult = {
  markupAmount?: number;
  markupPercent?: number;
  buyRate?: number;
  marginVsRetail?: number;
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categories: CategoriesService,
    private readonly bundles: BundlesService,
    private readonly s3Service: S3Service,
  ) {}

  // --------------------------------------------------
  // S3 HELPERS
  // --------------------------------------------------

  private async deleteS3Asset(key?: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3Service.delete(key);
    } catch {
      this.logger.warn('Unable to delete product asset from S3');
    }
  }

  // Convert stored S3 object keys to URLs for the response only.
  // The converted URLs are not saved back to MongoDB.
  private toResponse(product: ProductDocument): ProductDocument {
    if (product.marketplace?.termsUrl) {
      product.marketplace.termsUrl =
        this.s3Service.urlFor(product.marketplace.termsUrl) ?? '';
    }

    if (product.marketplace?.imageUrl) {
      product.marketplace.imageUrl =
        this.s3Service.urlFor(product.marketplace.imageUrl) ?? '';
    }

    return product;
  }

  private handleDuplicateError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new ConflictException('Product name already exists');
    }

    throw error;
  }

  // --------------------------------------------------
  // PRICING VALIDATION
  // --------------------------------------------------

  private assertPricing(p: {
    retailPrice?: number;
    discountType?: DiscountType;
    discountValue?: number | null;
  }): void {
    const hasType = Boolean(p.discountType);
    const hasValue = p.discountValue != null;

    if (hasType !== hasValue) {
      throw new BadRequestException(
        'discountType and discountValue must be given together',
      );
    }

    if (p.discountType === DiscountType.Percentage && p.discountValue! > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (
      p.discountType === DiscountType.Fixed &&
      p.retailPrice != null &&
      p.discountValue! > p.retailPrice
    ) {
      throw new BadRequestException(
        'Discount cannot be more than the retail price',
      );
    }
  }

  // --------------------------------------------------
  // MARGIN CALCULATION
  // --------------------------------------------------

  private calculateMargin(p: MarginCalculationInput): MarginCalculationResult {
    const { wholesalePrice, markupType, markupValue, retailPrice } = p;

    if (wholesalePrice == null || markupType == null || markupValue == null) {
      return {};
    }

    if (
      !Number.isFinite(wholesalePrice) ||
      !Number.isFinite(markupValue) ||
      wholesalePrice < 0 ||
      markupValue < 0
    ) {
      throw new BadRequestException(
        'Wholesale price and markup value must be valid non-negative numbers',
      );
    }

    if (markupType === MarkupType.Percent && markupValue > 100) {
      throw new BadRequestException('Markup percentage cannot exceed 100');
    }

    const rawMarkupAmount =
      markupType === MarkupType.Percent
        ? (wholesalePrice * markupValue) / 100
        : markupValue;

    const markupAmount = Math.round(rawMarkupAmount * 100) / 100;

    const markupPercent =
      wholesalePrice > 0
        ? Math.round((markupAmount / wholesalePrice) * 10000) / 100
        : 0;

    const buyRate = Math.round((wholesalePrice + markupAmount) * 100) / 100;

    const marginVsRetail =
      retailPrice == null
        ? undefined
        : Math.round((retailPrice - buyRate) * 100) / 100;

    return {
      markupAmount,
      markupPercent,
      buyRate,
      ...(marginVsRetail !== undefined ? { marginVsRetail } : {}),
    };
  }

  // --------------------------------------------------
  // REFERENCE VALIDATION
  // --------------------------------------------------

  private async assertRefs(
    category?: string,
    bundled?: string[],
  ): Promise<void> {
    if (category) {
      await this.categories.findOneCategories(category);
    }

    if (bundled?.length) {
      await Promise.all(bundled.map((id) => this.bundles.findOne(id)));
    }
  }

  // --------------------------------------------------
  // SANITIZE RICH CONTENT
  // --------------------------------------------------

  private cleanContent(dto: {
    marketplace?: {
      longDescription?: string;
      pricingRenewalContent?: string;
    };
  }): void {
    const marketplace = dto.marketplace;

    if (marketplace?.longDescription) {
      marketplace.longDescription = sanitizeRichText(
        marketplace.longDescription,
      );
    }

    if (marketplace?.pricingRenewalContent) {
      marketplace.pricingRenewalContent = sanitizeRichText(
        marketplace.pricingRenewalContent,
      );
    }
  }

  // --------------------------------------------------
  // PUBLISH VALIDATION
  // --------------------------------------------------

  private assertPublishable(product: ProductDocument): void {
    const missing: string[] = [];

    if (!product.providerId) {
      missing.push('providerId');
    }

    if (!product.marketplace?.shortDescription) {
      missing.push('marketplace.shortDescription');
    }

    if (!product.marketplace?.longDescription) {
      missing.push('marketplace.longDescription');
    }

    if (!product.marketplace?.pricingRenewalContent) {
      missing.push('marketplace.pricingRenewalContent');
    }

    if (!product.dashboard?.template) {
      missing.push('dashboard.template');
    }

    if (!product.dashboard?.title) {
      missing.push('dashboard.title');
    }

    if (!product.dashboard?.callToAction) {
      missing.push('dashboard.callToAction');
    }

    if (!product.dashboard?.featureTitle) {
      missing.push('dashboard.featureTitle');
    }

    if (!product.dashboard?.shortDescription) {
      missing.push('dashboard.shortDescription');
    }

    if (product.retailPrice == null) {
      missing.push('retailPrice');
    }

    if (product.wholesalePrice == null) {
      missing.push('wholesalePrice');
    }

    if (!product.markupType) {
      missing.push('markupType');
    }

    if (product.markupValue == null) {
      missing.push('markupValue');
    }

    if (product.markupAmount == null) {
      missing.push('markupAmount');
    }

    if (product.markupPercent == null) {
      missing.push('markupPercent');
    }

    if (product.buyRate == null) {
      missing.push('buyRate');
    }

    if (product.marginVsRetail == null) {
      missing.push('marginVsRetail');
    }

    if (
      product.audienceType === AudienceType.ProviderRules &&
      !product.configurationId
    ) {
      missing.push('configurationId');
    }

    if (!product.placements?.length) {
      missing.push('placements');
    }

    if (!product.perUserFrequencyCap) {
      missing.push('perUserFrequencyCap');
    }

    if (!product.publishMode) {
      missing.push('publishMode');
    }

    if (product.publishMode === PublishMode.Scheduled && !product.scheduledAt) {
      missing.push('scheduledAt');
    }

    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Complete these fields before publishing',
        missing,
      });
    }

    if (
      product.scheduledAt &&
      product.expiresAt &&
      product.expiresAt <= product.scheduledAt
    ) {
      throw new BadRequestException('expiresAt must be after scheduledAt');
    }

    if (product.expiresAt && product.expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be in the future');
    }
  }

  // --------------------------------------------------
  // CREATE PRODUCT DRAFT
  // --------------------------------------------------

  async create(
    dto: CreateProductDto,
    userId: string,
    files?: ProductFiles,
  ): Promise<ProductDocument> {
    this.assertPricing(dto);
    await this.assertRefs(dto.category, dto.bundled);
    this.cleanContent(dto);

    let termsKey: string | undefined;
    let imageKey: string | undefined;
    let savedSuccessfully = false;

    try {
      const marketplace = { ...(dto.marketplace ?? {}) };

      const termsFile = files?.termsUrl?.[0];
      const imageFile = files?.imageUrl?.[0];

      if (termsFile) {
        const uploaded = await this.s3Service.upload('products', termsFile);
        termsKey = uploaded.key;
        marketplace.termsUrl = uploaded.key;
      }

      if (imageFile) {
        const uploaded = await this.s3Service.upload('products', imageFile);
        imageKey = uploaded.key;
        marketplace.imageUrl = uploaded.key;
      }

      const marginData = this.calculateMargin({
        wholesalePrice: dto.wholesalePrice,
        markupType: dto.markupType,
        markupValue: dto.markupValue,
        retailPrice: dto.retailPrice,
      });

      const product = await this.productModel.create({
        ...dto,
        marketplace,
        ...marginData,
        status: ProductStatus.Draft,
        createdBy: userId,
        updatedBy: userId,
      });

      savedSuccessfully = true;

      return this.toResponse(product);
    } catch (error: unknown) {
      if (!savedSuccessfully) {
        await Promise.all([
          this.deleteS3Asset(termsKey),
          this.deleteS3Asset(imageKey),
        ]);
      }

      return this.handleDuplicateError(error);
    }
  }

  // --------------------------------------------------
  // GET ALL PRODUCTS
  // --------------------------------------------------

  async findAll(q: QueryProductDto): Promise<PaginatedProductsResponse> {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));

    const filter: Record<string, unknown> = {};

    if (q.status) {
      filter.status = q.status;
    }

    if (q.category) {
      filter.category = q.category;
    }

    if (q.search?.trim()) {
      const safe = q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      filter.name = {
        $regex: safe,
        $options: 'i',
      };
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name')
        .populate('bundled', 'name shortCode')
        .populate('configurationId', 'name')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),

      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((product) => this.toResponse(product)),
      total,
      page,
      limit,
    };
  }

  // --------------------------------------------------
  // GET PRODUCT BY ID
  // --------------------------------------------------

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name')
      .populate('bundled', 'name shortCode')
      .populate('configurationId', 'name')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toResponse(product);
  }

  // --------------------------------------------------
  // UPDATE PRODUCT
  // --------------------------------------------------

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    files?: ProductFiles,
  ): Promise<ProductDocument> {
    const current = await this.productModel.findById(id).exec();

    if (!current) {
      throw new NotFoundException('Product not found');
    }

    this.assertPricing({
      retailPrice: dto.retailPrice ?? current.retailPrice,
      discountType: dto.discountType ?? current.discountType,
      discountValue: dto.discountValue ?? current.discountValue,
    });

    await this.assertRefs(dto.category, dto.bundled);
    this.cleanContent(dto);

    const marginData = this.calculateMargin({
      wholesalePrice: dto.wholesalePrice ?? current.wholesalePrice,
      markupType: dto.markupType ?? current.markupType,
      markupValue: dto.markupValue ?? current.markupValue,
      retailPrice: dto.retailPrice ?? current.retailPrice,
    });

    const { marketplace, dashboard, ...rest } = dto;

    const set: Record<string, unknown> = {
      ...rest,
      ...marginData,
      updatedBy: userId,
    };

    for (const [key, value] of Object.entries(marketplace ?? {})) {
      set[`marketplace.${key}`] = value;
    }

    for (const [key, value] of Object.entries(dashboard ?? {})) {
      set[`dashboard.${key}`] = value;
    }

    const oldTermsKey = current.marketplace?.termsUrl;
    const oldImageKey = current.marketplace?.imageUrl;

    let newTermsKey: string | undefined;
    let newImageKey: string | undefined;
    let savedSuccessfully = false;

    try {
      const termsFile = files?.termsUrl?.[0];
      const imageFile = files?.imageUrl?.[0];

      if (termsFile) {
        const uploaded = await this.s3Service.upload('products', termsFile);
        newTermsKey = uploaded.key;
        set['marketplace.termsUrl'] = uploaded.key;
      }

      if (imageFile) {
        const uploaded = await this.s3Service.upload('products', imageFile);
        newImageKey = uploaded.key;
        set['marketplace.imageUrl'] = uploaded.key;
      }

      const product = await this.productModel
        .findByIdAndUpdate(
          id,
          { $set: set },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .populate('category', 'name')
        .populate('bundled', 'name shortCode')
        .populate('configurationId', 'name')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name')
        .exec();

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      savedSuccessfully = true;

      // Delete old assets only after MongoDB has saved the replacement keys.
      if (newTermsKey && oldTermsKey && newTermsKey !== oldTermsKey) {
        await this.deleteS3Asset(oldTermsKey);
      }

      if (newImageKey && oldImageKey && newImageKey !== oldImageKey) {
        await this.deleteS3Asset(oldImageKey);
      }

      return this.toResponse(product);
    } catch (error: unknown) {
      if (!savedSuccessfully) {
        await Promise.all([
          this.deleteS3Asset(newTermsKey),
          this.deleteS3Asset(newImageKey),
        ]);
      }

      return this.handleDuplicateError(error);
    }
  }

  // --------------------------------------------------
  // PUBLISH PRODUCT
  // --------------------------------------------------

  async publish(id: string, userId: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const marginData = this.calculateMargin({
      wholesalePrice: product.wholesalePrice,
      markupType: product.markupType,
      markupValue: product.markupValue,
      retailPrice: product.retailPrice,
    });

    Object.assign(product, marginData);

    this.assertPublishable(product);

    const goesLater =
      product.publishMode === PublishMode.Scheduled &&
      product.scheduledAt != null &&
      product.scheduledAt > new Date();

    product.status = goesLater ? ProductStatus.Scheduled : ProductStatus.Active;

    product.updatedBy = userId as never;

    const savedProduct = await product.save();

    return this.toResponse(savedProduct);
  }

  // --------------------------------------------------
  // DELETE PRODUCT
  // --------------------------------------------------

  async remove(id: string): Promise<{ deleted: boolean }> {
    const product = await this.productModel.findByIdAndDelete(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      deleted: true,
    };
  }

  // --------------------------------------------------
  // OTHER HELPERS
  // --------------------------------------------------

  async findByIds(ids: string[]) {
    return this.productModel
      .find({ _id: { $in: ids } })
      .select('_id')
      .exec();
  }

  async findAllForPicker() {
    return this.productModel
      .find()
      .select('name category retailPrice status')
      .populate('category', 'name')
      .sort({ name: 1 })
      .exec();
  }

  count() {
    return this.productModel.countDocuments().exec();
  }
}
