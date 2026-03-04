import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import dbConnect from '@/lib/mongodb';
import { CarWashActivity } from '@/models/CarWashActivity';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (userId) {
      query.userId = userId;
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

    const activities = await CarWashActivity.find(query)
      .populate('userId', 'lineDisplayName lineProfileImage name surname employeeId')
      .sort({ activityDate: -1, createdAt: -1 });

    return NextResponse.json({ success: true, activities });
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
    const image = formData.get('image') as File | null;
    const activityType = (formData.get('activityType') as string) || 'car-wash';
    const caption = (formData.get('caption') as string) || '';
    const activityDate = formData.get('activityDate') as string;
    const activityTime = formData.get('activityTime') as string;
    const userId = formData.get('userId') as string;

    if (!image) {
      return NextResponse.json({ error: 'กรุณาอัปโหลดรูปภาพ' }, { status: 400 });
    }
    if (!activityDate || !activityTime) {
      return NextResponse.json({ error: 'กรุณาระบุวันที่และเวลา' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const filename = `car-wash/${userId}/${Date.now()}-${image.name}`;
    const blob = await put(filename, image, {
      access: 'private',
      addRandomSuffix: true,
      token: process.env.itl_READ_WRITE_TOKEN,
    });

    await dbConnect();

    const activity = await CarWashActivity.create({
      userId,
      activityType,
      imageUrl: blob.url,
      caption,
      activityDate: new Date(activityDate),
      activityTime,
    });

    await activity.populate('userId', 'lineDisplayName lineProfileImage name surname employeeId');

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Create CarWash Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
