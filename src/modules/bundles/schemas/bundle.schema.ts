import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BundleDocument = HydratedDocument<Bundle>;

export enum PricingType {
  AddOn = 'addOn',
  Bundle = 'bundle',
}

export enum DiscountType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

@Schema({ _id: false })
export class BundleTemplate {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  shortDescription: string;

  @Prop({ type: String })
  backgroundImage?: string;

  @Prop({ type: String, required: true })
  iconFamily: string;

  @Prop({ type: String, required: true })
  appIcon: string;

  @Prop({ type: String })
  webIcon?: string;

  @Prop({ type: String })
  cardBackgroundColor?: string;

  @Prop({ type: String })
  iconBackground?: string;
}

export const BundleTemplateSchema =
  SchemaFactory.createForClass(BundleTemplate);

@Schema({ timestamps: true })
export class Bundle {
  // 1. Basic info
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  })
  shortCode: string;

  @Prop({ type: String, required: true })
  iconFamily: string;

  @Prop({ type: String, required: true })
  appIcon: string;

  @Prop({ type: String })
  webIcon?: string;

  @Prop({ type: String })
  backgroundColor?: string;

  @Prop({ type: String, enum: PricingType, required: true })
  pricingType: PricingType;

  @Prop({ type: Boolean, default: true })
  status: boolean;

  // 2. Pricing (add-on only)
  @Prop({ type: Number, min: 0 })
  price?: number;

  @Prop({ type: Boolean, default: false })
  hasDiscount: boolean;

  @Prop({ type: String, enum: DiscountType })
  discountType?: DiscountType;

  @Prop({ type: Number, min: 0 })
  discountValue?: number;

  // 3. Client-facing content
  @Prop({ type: String, required: true })
  longDescription: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];

  @Prop({ type: String })
  supportPhone?: string;

  @Prop({ type: String })
  websiteUrl?: string;

  @Prop({ type: String, trim: true, uppercase: true })
  promoCode?: string;

  @Prop({ type: String })
  promoCodeUsageNote?: string;

  @Prop({ type: String })
  disclosure?: string;

  @Prop({ type: String })
  disclaimer?: string;

  @Prop({ type: String })
  additionalInformation?: string;

  @Prop({ type: String })
  insuranceInstructions?: string;

  // 4. Template
  @Prop({ type: BundleTemplateSchema, required: true })
  template: BundleTemplate;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const BundleSchema = SchemaFactory.createForClass(Bundle);

BundleSchema.virtual('sellingPrice').get(function (this: BundleDocument) {
  if (this.price == null) return undefined;
  if (!this.hasDiscount || !this.discountValue) return this.price;

  const off =
    this.discountType === DiscountType.Percentage
      ? (this.price * this.discountValue) / 100
      : this.discountValue;

  return Math.max(this.price - off, 0);
});

BundleSchema.set('toJSON', { virtuals: true });
BundleSchema.set('toObject', { virtuals: true });
