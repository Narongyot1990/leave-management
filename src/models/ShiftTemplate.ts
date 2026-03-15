import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShiftTemplate extends Document {
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftTemplateSchema = new Schema<IShiftTemplate>(
  {
    name: { type: String, required: true },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    startMinute: { type: Number, required: true, min: 0, max: 59, default: 0 },
    endHour: { type: Number, required: true, min: 0, max: 23 },
    endMinute: { type: Number, required: true, min: 0, max: 59, default: 0 },
    color: { type: String, required: true, default: '#6366f1' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const ShiftTemplate: Model<IShiftTemplate> =
  mongoose.models.ShiftTemplate || mongoose.model<IShiftTemplate>('ShiftTemplate', ShiftTemplateSchema);
