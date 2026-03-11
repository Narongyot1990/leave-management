import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/mongodb';
import { CarWashActivity } from '@/models/CarWashActivity';
import { requireAuth } from '@/lib/api-auth';
import { pusher, CHANNELS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const activityType = searchParams.get('activityType');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (userId) {
      query.userId = userId;
    }
    if (activityType) {
      query.activityType = activityType;
    }
    if (startDate || endDate) {
      query.activityDate = {};
      if (startDate) {
        (query.activityDate as Record<string, unknown>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (query.activityDate as Record<string, unknown>).$lte = end;
      }
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const total = await CarWashActivity.countDocuments(query);

    const activities = await CarWashActivity.find(query)
      .populate('userId', 'lineDisplayName lineProfileImage name surname employeeId')
      .populate('comments.userId', 'lineDisplayName lineProfileImage name surname')
      .populate('markedBy', 'lineDisplayName name surname')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const hasMore = skip + activities.length < total;

    return NextResponse.json({ success: true, activities, hasMore, total });
  } catch (error) {
    console.error('Get CarWash Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const formData = await request.formData();
    const images = formData.getAll('images') as File[];
    const activityType = (formData.get('activityType') as string) || 'car-wash';
    const caption = (formData.get('caption') as string) || '';
    const activityDate = formData.get('activityDate') as string;
    const activityTime = formData.get('activityTime') as string;
    const userId = formData.get('userId') as string;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป' }, { status: 400 });
    }
    if (!activityDate || !activityTime) {
      return NextResponse.json({ error: 'กรุณาระบุวันที่และเวลา' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Upload all images to Vercel Blob (private store)
    const imageUrls: string[] = [];
    for (const image of images) {
      const filename = `car-wash/${userId}/${Date.now()}-${image.name}`;
      const blob = await put(filename, image, {
        access: 'private',
        addRandomSuffix: true,
        token: process.env.itl_READ_WRITE_TOKEN,
      });
      imageUrls.push(blob.url);
    }

    await dbConnect();

    const activity = await CarWashActivity.create({
      userId,
      activityType,
      imageUrls,
      caption,
      activityDate: new Date(activityDate),
      activityTime,
    });

    await activity.populate('userId', 'lineDisplayName lineProfileImage name surname employeeId');

    // Pusher realtime — new post (send only ID to stay under 10KB limit)
    try {
      await pusher.trigger(CHANNELS.CAR_WASH, 'new-activity', {
        activityId: activity._id.toString(),
      });
    } catch (pusherError) {
      console.error('Pusher Error:', pusherError);
    }

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Create CarWash Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
