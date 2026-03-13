import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { Task } from '@/models/Task';
import { requireAuth, requireLeader } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    await dbConnect();

    const task = await Task.findById(id)
      .populate('createdBy', 'name surname')
      .populate('submissions.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Get Task Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — submit answers or update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { payload } = authResult;

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    await dbConnect();

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // --- SUBMIT answers (driver) ---
    if (action === 'submit') {
      const { userId, answers } = body;
      if (!userId || !answers) {
        return NextResponse.json({ error: 'userId and answers are required' }, { status: 400 });
      }

      // Check if already submitted
      const already = task.submissions.find(
        (s) => s.userId.toString() === userId
      );
      if (already) {
        return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
      }

      // Calculate score
      let score = 0;
      const total = task.questions.length;
      task.questions.forEach((q, i) => {
        if (answers[i] === q.correctIndex) score++;
      });

      task.submissions.push({
        userId: new mongoose.Types.ObjectId(userId),
        answers,
        score,
        total,
        submittedAt: new Date(),
      } as any);

      await task.save();
      await task.populate('submissions.userId', 'lineDisplayName lineProfileImage name surname performanceTier');

      return NextResponse.json({ success: true, task, score, total });
    }

    // --- UPDATE task (leader) ---
    if (payload.role !== 'leader') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, description, category, branches, questions, deadline, status } = body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (category !== undefined) task.category = category;
    if (branches !== undefined) task.branches = branches;
    if (questions !== undefined) task.questions = questions;
    if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : undefined;
    if (status !== undefined) task.status = status;

    await task.save();

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Update Task Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE task (leader only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireLeader(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    await dbConnect();

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Task Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
