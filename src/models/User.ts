import mongoose, { Schema, Document, Model } from 'mongoose';
import { PERFORMANCE_TIERS, type PerformanceTier } from '@/lib/profile-tier';

export type DriverStatus = 'pending' | 'active';

export interface IUser extends Document {
  lineUserId: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier: PerformanceTier;
  performancePoints: number;
  performanceLevel: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  status: DriverStatus;
  vacationDays: number;
  sickDays: number;
  personalDays: number;
  lastSeen?: Date;
  isOnline?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    lineUserId: { type: String, required: true, unique: true },
    lineDisplayName: { type: String, required: true },
    lineProfileImage: { type: String },
    performanceTier: { type: String, enum: PERFORMANCE_TIERS, default: 'standard' },
    performancePoints: { type: Number, default: 0 },
    performanceLevel: { type: Number, default: 1 },
    name: { type: String },
    surname: { type: String },
    phone: { type: String },
    employeeId: { type: String },
    status: { type: String, enum: ['pending', 'active'], default: 'pending' },
    vacationDays: { type: Number, default: 10 },
    sickDays: { type: Number, default: 10 },
    personalDays: { type: Number, default: 5 },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
