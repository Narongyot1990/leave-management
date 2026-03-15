import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment {
  _id?: string;
  userId: any; // Allow string or ObjectId
  text: string;
  createdAt: Date;
}

export interface ICarWashActivity extends Document {
  userId: any; // Allow string or ObjectId
  activityType: string;
  imageUrls: string[];
  caption: string;
  activityDate: Date;
  activityTime: string;
  likes: any[]; // Allow string or ObjectId array
  comments: IComment[];
  marked: boolean;
  markedBy?: any; // Allow string or ObjectId
  markedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    userId: { type: String, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CarWashActivitySchema = new Schema<ICarWashActivity>(
  {
    userId: { type: String, ref: 'User', required: true },
    activityType: { type: String, default: 'car-wash' },
    imageUrls: [{ type: String }],
    caption: { type: String, default: '' },
    activityDate: { type: Date, required: true },
    activityTime: { type: String, required: true },
    likes: [{ type: String, ref: 'User' }],
    comments: [CommentSchema],
    marked: { type: Boolean, default: false },
    markedBy: { type: String, ref: 'User' },
    markedAt: { type: Date },
  },
  { timestamps: true }
);

CarWashActivitySchema.index({ userId: 1, activityDate: -1 });
CarWashActivitySchema.index({ createdAt: -1 });

export const CarWashActivity: Model<ICarWashActivity> =
  mongoose.models.CarWashActivity || mongoose.model<ICarWashActivity>('CarWashActivity', CarWashActivitySchema);
