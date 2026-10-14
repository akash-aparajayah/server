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
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, trim: true }) shortDescription: string;
  @Prop() backgroundImage?: string;
  @Prop({ required: true }) iconFamily: string;
  @Prop({ required: true }) appIcon: string;
  @Prop() webIcon?: string;
  @Prop() cardBackgroundColor?: string;
  @Prop() iconBackground?: string;
}
export const BundleTemplateSchema =
  SchemaFactory.createForClass(BundleTemplate);

@Schema({ timestamps: true })
export class Bundle {
  // 1. Basic info
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  shortCode: string;
  @Prop({ required: true }) iconFamily: string;
  @Prop({ required: true }) appIcon: string;
  @Prop() webIcon?: string;
  @Prop() backgroundColor?: string;
  @Prop({ type: String, enum: PricingType, required: true })
  pricingType: PricingType;
  @Prop({ default: true }) status: boolean;

  // pricing (add-on only)
  @Prop({ min: 0 }) price?: number;
  @Prop({ default: false }) hasDiscount: boolean;
  @Prop({ type: String, enum: DiscountType }) discountType?: DiscountType;
  @Prop({ min: 0 }) discountValue?: number;

  // 2. Client-facing content
  @Prop({ required: true }) longDescription: string;
  @Prop({ type: [String], default: [] }) benefits: string[];
  @Prop() supportPhone?: string;
  @Prop() websiteUrl?: string;
  @Prop({ trim: true, uppercase: true }) promoCode?: string;
  @Prop() promoCodeUsageNote?: string;
  @Prop() disclosure?: string;
  @Prop() disclaimer?: string;
  @Prop() additionalInformation?: string;
  @Prop() insuranceInstructions?: string;

  // 3. Template
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
