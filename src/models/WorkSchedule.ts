import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkScheduleEntry {
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  shiftName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

export interface IWorkSchedule extends Document {
  userId: string;
  entries: IWorkScheduleEntry[];
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkScheduleEntrySchema = new Schema<IWorkScheduleEntry>(
  {
    date: { type: String, required: true },
    shiftTemplateId: { type: String, required: true },
    shiftName: { type: String, required: true },
    startHour: { type: Number, required: true },
    startMinute: { type: Number, required: true, default: 0 },
    endHour: { type: Number, required: true },
    endMinute: { type: Number, required: true, default: 0 },
    color: { type: String, required: true },
  },
  { _id: false }
);

const WorkScheduleSchema = new Schema<IWorkSchedule>(
  {
    userId: { type: String, required: true, unique: true },
    entries: { type: [WorkScheduleEntrySchema], default: [] },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const WorkSchedule: Model<IWorkSchedule> =
  mongoose.models.WorkSchedule || mongoose.model<IWorkSchedule>('WorkSchedule', WorkScheduleSchema);
