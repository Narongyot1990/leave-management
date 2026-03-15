import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import { requireAuth } from '@/lib/api-auth';
import { Attendance } from '@/models/Attendance';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// Helper to calculate distance in meters (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const branch = searchParams.get('branch');
    const date = searchParams.get('date'); // YYYY-MM-DD

    await dbConnect();

    const query: any = {};
    const { role, userId: currentUserId, branch: userBranch } = authResult.payload;

    if (role === 'leader') {
      if (mongoose.Types.ObjectId.isValid(currentUserId)) {
        query.userId = currentUserId;
      }
    } else if (role === 'admin') {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = userId;
      }
      if (branch) query.branch = branch;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(query).sort({ timestamp: -1 }).limit(100);

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Get Attendance Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { type, location, branchCode, branchLocation, radius } = body;

    if (!type || !location || !branchCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { userId } = authResult.payload;
    const distance = branchLocation 
      ? getDistance(location.lat, location.lon, branchLocation.lat, branchLocation.lon)
      : 999999;
    
    // Use branch-specific radius with 5m buffer
    const limit = (radius || 50) + 5;
    const isInside = distance <= limit;
    
    await dbConnect();

    // Fetch user name and image from User model if not in payload
    const { User } = await import('@/models/User');
    let userName = 'Unknown';
    let userImage: string | undefined;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const userDoc = await User.findById(userId);
      userName = userDoc?.name || userDoc?.lineDisplayName || 'Unknown';
      userImage = userDoc?.lineProfileImage;
    } else if (userId === 'admin_root') {
      userName = 'ITL Administrator';
    }

    const record = await Attendance.create({
      userId,
      userName,
      userImage,
      type,
      branch: branchCode,
      location,
      distance,
      isInside,
      timestamp: new Date()
    });

    // Real-time notification for admin
    await triggerPusher(CHANNELS.USERS, 'leader-attendance', {
      record: {
        ...record.toObject(),
        userName
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Post Attendance Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/attendance?id=...
export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await dbConnect();

    const record = await Attendance.findById(id);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Permission check: only owner or admin
    const { userId, role } = authResult.payload;
    if (role !== 'admin' && record.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Attendance.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Attendance Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
