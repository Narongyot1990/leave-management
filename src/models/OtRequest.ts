import mongoose, { Schema, Document, Model } from 'mongoose';

export type OtStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type OtClaimType = 'ot' | 'holiday_work' | 'extra_trip' | 'night_shift';

export interface IOtRequest extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  claimType: OtClaimType;
  reason: string;
  photoUrl: string;
  status: OtStatus;
  approvedBy?: string | mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OtRequestSchema = new Schema<IOtRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    claimType: {
      type: String,
      enum: ['ot', 'holiday_work', 'extra_trip', 'night_shift'],
      required: true,
      default: 'ot',
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    photoUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: Schema.Types.Mixed, ref: 'User' },
    approvedAt: { type: Date },
    rejectedReason: { type: String },
  },
  { timestamps: true }
);

OtRequestSchema.index({ userId: 1, date: 1, claimType: 1 });
OtRequestSchema.index({ status: 1, createdAt: -1 });

export const OtRequest: Model<IOtRequest> =
  mongoose.models.OtRequest ||
  mongoose.model<IOtRequest>('OtRequest', OtRequestSchema);
