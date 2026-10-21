import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserSettingsDocument = HydratedDocument<UserSettings>;

@Schema({ _id: false })
export class Preferences {
  @Prop({ type: String }) theme?: string;
  @Prop({ type: String }) language?: string;
  @Prop({ type: String }) currency?: string;
  @Prop({ type: String }) dateFormat?: string;
  @Prop({ type: String }) timeZone?: string;
}
export const PreferencesSchema = SchemaFactory.createForClass(Preferences);

@Schema({ _id: false })
export class ColumnPref {
  @Prop({ type: String, required: true }) key: string;
  @Prop({ type: Boolean, required: true }) visible: boolean;
  @Prop({ type: Number, required: true }) order: number;
}
export const ColumnPrefSchema = SchemaFactory.createForClass(ColumnPref);

@Schema({ _id: false })
export class TableColumns {
  @Prop({ type: String, required: true }) table: string;
  @Prop({ type: [ColumnPrefSchema], default: [] }) columns: ColumnPref[];
}
export const TableColumnsSchema = SchemaFactory.createForClass(TableColumns);

@Schema({ timestamps: true })
export class UserSettings {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: PreferencesSchema, default: () => ({}) })
  preferences: Preferences;

  @Prop({ type: [TableColumnsSchema], default: [] })
  columns: TableColumns[];
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
