import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CarWashActivity } from '@/models/CarWashActivity';
import { requireAuth } from '@/lib/api-auth';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await dbConnect();

    // Aggregate activity stats for the user
    const now = dayjs();
    const startOfMonth = now.startOf('month').toDate();
    const startOfWeek = now.startOf('isoWeek').toDate();
    const today = now.startOf('day').toDate();

    const [totalActivities, monthActivities, weekActivities, todayActivities, activityTypes] = await Promise.all([
      CarWashActivity.countDocuments({ userId }),
      CarWashActivity.countDocuments({ userId, activityDate: { $gte: startOfMonth } }),
      CarWashActivity.countDocuments({ userId, activityDate: { $gte: startOfWeek } }),
      CarWashActivity.countDocuments({ userId, activityDate: { $gte: today } }),
      CarWashActivity.aggregate([
        { $match: { userId: new Object(userId) } },
        { $group: { _id: '$activityType', count: { $sum: 1 } } }
      ])
    ]);

    // Format types into a cleaner object
    const typesCount = activityTypes.reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      stats: {
        total: totalActivities,
        thisMonth: monthActivities,
        thisWeek: weekActivities,
        today: todayActivities,
        byType: typesCount
      }
    });
  } catch (error) {
    console.error('Get Activity Stats Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
