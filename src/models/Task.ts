import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITaskQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ITaskSubmission {
  userId: mongoose.Types.ObjectId;
  answers: number[];
  score: number;
  total: number;
  submittedAt: Date;
}

export interface ITask extends Document {
  title: string;
  description: string;
  category: string;
  branches: string[];
  questions: ITaskQuestion[];
  submissions: ITaskSubmission[];
  deadline?: Date;
  status: 'active' | 'closed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskQuestionSchema = new Schema<ITaskQuestion>(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
  },
  { _id: false }
);

const TaskSubmissionSchema = new Schema<ITaskSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [{ type: Number }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, required: true },
    branches: [{ type: String, enum: ['AYA', 'CBI', 'KSN', 'RA2', 'BBT'] }],
    questions: [TaskQuestionSchema],
    submissions: [TaskSubmissionSchema],
    deadline: { type: Date },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1, createdAt: -1 });
TaskSchema.index({ 'submissions.userId': 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
