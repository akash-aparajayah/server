import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from '../../../common/enums/status.enum.js';

export type EntityDocument = HydratedDocument<Entity>;

@Schema({ timestamps: true })
export class Entity {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: Status, default: Status.Active })
  status: Status;

  // owner
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const EntitySchema = SchemaFactory.createForClass(Entity);

// same user ku same name 2 entity vendaam
EntitySchema.index({ createdBy: 1, name: 1 }, { unique: true });