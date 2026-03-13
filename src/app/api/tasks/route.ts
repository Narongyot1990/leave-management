import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Task } from '@/models/Task';
import { requireAuth, requireLeader } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// GET tasks — drivers see active tasks for their branch; leaders see all
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { payload } = authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const branch = searchParams.get('branch');
    const userId = searchParams.get('userId');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (branch) query.branches = branch;

    const tasks = await Task.find(query)
      .populate('createdBy', 'name surname')
      .populate('submissions.userId', 'lineDisplayName lineProfileImage name surname performanceTier')
      .sort({ createdAt: -1 });

    // If userId provided, annotate each task with whether user has submitted
    const tasksWithStatus = tasks.map((task) => {
      const taskObj = task.toObject();
      if (userId) {
        const submission = task.submissions.find(
          (s) => s.userId && s.userId.toString() === userId
        );
        (taskObj as any).mySubmission = submission || null;
        (taskObj as any).completed = !!submission;
      }
      return taskObj;
    });

    return NextResponse.json({ success: true, tasks: tasksWithStatus });
  } catch (error) {
    console.error('Get Tasks Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — leader creates a new task
export async function POST(request: NextRequest) {
  try {
    const authResult = requireLeader(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { title, description, category, branches, questions, deadline, createdBy } = body;

    if (!title || !category || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'title, category, and questions are required' }, { status: 400 });
    }

    await dbConnect();

    const task = await Task.create({
      title,
      description: description || '',
      category,
      branches: branches || [],
      questions,
      deadline: deadline ? new Date(deadline) : undefined,
      createdBy,
      status: 'active',
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Create Task Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
