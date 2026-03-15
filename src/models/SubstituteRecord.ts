import mongoose, { Schema, Document, Model } from 'mongoose';

export type RecordType =
  | 'vacation'
  | 'sick'
  | 'personal'
  | 'unpaid'
  | 'absent'
  | 'late'
  | 'accident'
  | 'damage';

export interface ISubstituteRecord extends Document {
  userId: any; // Allow string or ObjectId
  recordType: RecordType;
  description?: string;
  date: Date;
  createdBy: any; // Allow string or ObjectId
  createdAt: Date;
  updatedAt: Date;
}

const SubstituteRecordSchema = new Schema<ISubstituteRecord>(
  {
    userId: { type: String, ref: 'User', required: true },
    recordType: {
      type: String,
      enum: ['vacation', 'sick', 'personal', 'unpaid', 'absent', 'late', 'accident', 'damage'],
      required: true,
    },
    description: { type: String },
    date: { type: Date, required: true },
    createdBy: { type: String, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const SubstituteRecord: Model<ISubstituteRecord> =
  mongoose.models.SubstituteRecord ||
  mongoose.model<ISubstituteRecord>('SubstituteRecord', SubstituteRecordSchema);
