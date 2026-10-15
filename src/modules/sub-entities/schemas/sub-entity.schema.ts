import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from '../../../common/enums/status.enum.js';

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

  @Prop({ type: String, enum: Status, default: Status.Active })
  status: Status;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const SubEntitySchema = SchemaFactory.createForClass(SubEntity);

// same entity la same name 2 sub entity vendaam
SubEntitySchema.index({ entity: 1, name: 1 }, { unique: true });