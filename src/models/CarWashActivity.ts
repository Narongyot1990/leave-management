import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICarWashActivity extends Document {
  userId: mongoose.Types.ObjectId;
  activityType: string;
  imageUrl: string;
  caption: string;
  activityDate: Date;
  activityTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarWashActivitySchema = new Schema<ICarWashActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, default: 'car-wash' },
    imageUrl: { type: String, required: true },
    caption: { type: String, default: '' },
    activityDate: { type: Date, required: true },
    activityTime: { type: String, required: true },
  },
  { timestamps: true }
);

CarWashActivitySchema.index({ userId: 1, activityDate: -1 });

export const CarWashActivity: Model<ICarWashActivity> =
  mongoose.models.CarWashActivity || mongoose.model<ICarWashActivity>('CarWashActivity', CarWashActivitySchema);
