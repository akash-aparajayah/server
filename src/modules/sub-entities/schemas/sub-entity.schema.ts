import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubEntityDocument = HydratedDocument<SubEntity>;

@Schema({ timestamps: true })
export class SubEntity {
  // Parent entity
  @Prop({
    type: Types.ObjectId,
    ref: 'Entity',
    required: true,
    index: true,
  })
  entity: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
  })
  imageUrl?: string;

  @Prop({
    type: String,
    trim: true,
  })
  description?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  // Products selected for this environment
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  products: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  updatedBy: Types.ObjectId;
}

export const SubEntitySchema = SchemaFactory.createForClass(SubEntity);

// Prevent duplicate sub-entity names under the same entity.
SubEntitySchema.index({ entity: 1, name: 1 }, { unique: true });
