import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { WorkSchedule } from '@/models/WorkSchedule';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = searchParams.get('month'); // YYYY-MM
    await dbConnect();

    const query: any = {};
    if (userId) query.userId = userId;

    const schedules = await WorkSchedule.find(query);

    // If month filter, trim entries to that month
    if (month && schedules.length > 0) {
      return NextResponse.json({
        success: true,
        schedules: schedules.map(s => ({
          userId: s.userId,
          entries: s.entries.filter(e => e.date.startsWith(month)),
        })),
      });
    }

    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    console.error('GET WorkSchedule Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { role, userId: adminId } = authResult.payload;
    if (role !== 'admin' && role !== 'leader') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { userId, entries } = body;
    if (!userId || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Missing userId or entries' }, { status: 400 });
    }
    await dbConnect();
    // Upsert: replace all entries for this user
    const schedule = await WorkSchedule.findOneAndUpdate(
      { userId },
      { userId, entries, updatedBy: adminId },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    console.error('POST WorkSchedule Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
