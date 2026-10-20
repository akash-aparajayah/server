import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubEntityDocument = HydratedDocument<SubEntity>;

@Schema({ timestamps: true })
export class SubEntity {
  // parent entity
  @Prop({ type: Types.ObjectId, ref: 'Entity', required: true, index: true })
  entity: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const SubEntitySchema = SchemaFactory.createForClass(SubEntity);

// same entity la same name 2 sub entity vendaam
SubEntitySchema.index({ entity: 1, name: 1 }, { unique: true });