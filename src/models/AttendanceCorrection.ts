import mongoose, { Schema, Document, Model } from 'mongoose';

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface IAttendanceCorrection extends Document {
  userId: string;
  userName: string;
  type: 'in' | 'out';
  requestedTime: Date;
  reason: string;
  status: CorrectionStatus;
  location: {
    lat: number;
    lon: number;
  };
  distance: number;
  branch: string;
  approvedBy?: any;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceCorrectionSchema = new Schema<IAttendanceCorrection>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    requestedTime: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    location: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    distance: { type: Number, required: true },
    branch: { type: String, required: true },
    approvedBy: { type: Schema.Types.Mixed, ref: 'User' },
    approvedAt: { type: Date },
    rejectedReason: { type: String },
  },
  { timestamps: true }
);

export const AttendanceCorrection: Model<IAttendanceCorrection> =
  mongoose.models.AttendanceCorrection ||
  mongoose.model<IAttendanceCorrection>('AttendanceCorrection', AttendanceCorrectionSchema);
