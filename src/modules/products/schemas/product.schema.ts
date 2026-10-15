import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DiscountType } from '../../../common/enums/discount-type.enum.js';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Active = 'active',
  Inactive = 'inactive',
}

export enum AudienceType {
  Everyone = 'everyone',
  ProviderRules = 'providerRules',
}

export enum Placement {
  Marketplace = 'marketplace',
  DashboardRecommendation = 'dashboardRecommendation',
  OfferCarousel = 'offerCarousel',
  PostAdvanceScreen = 'postAdvanceScreen',
}

export enum PublishMode {
  Immediate = 'immediate',
  Scheduled = 'scheduled',
}

@Schema({ _id: false })
export class MarketplaceContent {
  @Prop({ type: String }) termsUrl?: string;
  @Prop({ type: String }) imageUrl?: string;
  @Prop({ type: String }) imageBackgroundColor?: string;
  @Prop({ type: String, trim: true }) shortDescription?: string;
  @Prop({ type: String }) longDescription?: string;
  @Prop({ type: String }) pricingRenewalContent?: string;
}
export const MarketplaceContentSchema =
  SchemaFactory.createForClass(MarketplaceContent);

@Schema({ _id: false })
export class DashboardContent {
  @Prop({ type: String, trim: true }) template?: string;
  @Prop({ type: String, trim: true }) title?: string;
  @Prop({ type: String, trim: true }) callToAction?: string;
  @Prop({ type: String, trim: true }) featureTitle?: string;
  @Prop({ type: String, trim: true }) shortDescription?: string;
}
export const DashboardContentSchema =
  SchemaFactory.createForClass(DashboardContent);

@Schema({ timestamps: true })
export class Product {
  // Step 1: Overview
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  category: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Provider', index: true })
  providerId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ProductStatus,
    default: ProductStatus.Draft,
    index: true,
  })
  status: ProductStatus;

  // Step 2: Content
  @Prop({ type: MarketplaceContentSchema, default: () => ({}) })
  marketplace: MarketplaceContent;

  @Prop({ type: DashboardContentSchema, default: () => ({}) })
  dashboard: DashboardContent;

  // Step 3: Pricing & Bundle
  @Prop({ type: Number, min: 0 }) retailPrice?: number;
  @Prop({ type: String, enum: DiscountType }) discountType?: DiscountType;
  @Prop({ type: Number, min: 0 }) discountValue?: number;
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Bundle' }], default: [] })
  bundled: Types.ObjectId[];

  // Step 4: Audience
  @Prop({ type: String, enum: AudienceType, default: AudienceType.Everyone })
  audienceType: AudienceType;
  @Prop({ type: Types.ObjectId, ref: 'EngineConfig', required: true, index: true })
  configurationId: Types.ObjectId;

  // Step 5: Placement
  @Prop({ type: [String], enum: Placement, default: [] })
  placements: Placement[];

  @Prop({ type: Number, min: 1 }) perUserFrequencyCap?: number;

  @Prop({ type: String, enum: PublishMode }) publishMode?: PublishMode;
  @Prop({ type: Date, default: null }) scheduledAt?: Date | null;
  @Prop({ type: Date, default: null }) expiresAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.virtual('sellingPrice').get(function (this: ProductDocument) {
  if (this.retailPrice == null) return undefined;
  if (!this.discountType || !this.discountValue) return this.retailPrice;
  const off =
    this.discountType === DiscountType.Percentage
      ? (this.retailPrice * this.discountValue) / 100
      : this.discountValue;
  return Math.round(Math.max(this.retailPrice - off, 0) * 100) / 100;
});

ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });
