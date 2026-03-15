import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeaveType = 'vacation' | 'sick' | 'personal' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ILeaveRequest extends Document {
  userId: mongoose.Types.ObjectId;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: any; // Allow string or ObjectId
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: {
      type: String,
      enum: ['vacation', 'sick', 'personal', 'unpaid'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvedBy: { type: String, ref: 'User' },
    approvedAt: { type: Date },
    rejectedReason: { type: String },
  },
  { timestamps: true }
);

export const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest ||
  mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);
