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
    const range = searchParams.get('range'); // 'day' | 'week' | 'month'

    await dbConnect();

    const query: any = {};
    const { role, userId: currentUserId, branch: userBranch } = authResult.payload;

    if (role === 'driver') {
      // Drivers can only see their own records
      if (mongoose.Types.ObjectId.isValid(currentUserId)) {
        query.userId = currentUserId;
      }
    } else if (role === 'leader') {
      // Leaders: if specific userId requested, filter; otherwise show all (branch-scoped below)
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = userId;
      }
      // Leaders see their own branch's records
      if (userBranch) {
        query.branch = { $regex: new RegExp(`^${userBranch}$`, 'i') };
      }
    } else if (role === 'admin') {
      // Admin: optional filters
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = userId;
      }
      if (branch) query.branch = branch;
    }

    // Date range handling
    if (date) {
      const baseDate = new Date(date);
      let start: Date;
      let end: Date;

      if (range === 'month') {
        start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else if (range === 'week') {
        const dayOfWeek = baseDate.getDay();
        start = new Date(baseDate);
        start.setDate(baseDate.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        // Default: single day
        start = new Date(baseDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(baseDate);
        end.setHours(23, 59, 59, 999);
        
        // For single day view, we also need to fetch the last 'in' record before this day 
        // to see if it's an ongoing session that crosses into today.
        const lastInBefore = await Attendance.findOne({
          ...query,
          type: 'in',
          timestamp: { $lt: start }
        }).sort({ timestamp: -1 });

        if (lastInBefore) {
          // Check if it has a matching 'out' before 'start'
          const matchingOut = await Attendance.findOne({
            userId: lastInBefore.userId,
            type: 'out',
            timestamp: { $gt: lastInBefore.timestamp, $lt: start }
          });

          if (!matchingOut) {
            // It's an ongoing session from yesterday! 
            // Include this 'in' record in the results.
            query.timestamp = { $gte: lastInBefore.timestamp, $lte: end };
          }
        }
      }
    } else {
      // No date specified, just return latest
    }

    // Higher limit for admin month views
    const limit = (role === 'admin' && range === 'month') ? 2000 : 500;
    const records = await Attendance.find(query).sort({ timestamp: 1 }).limit(limit);

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

    await dbConnect();

    // Relaxed sequence: Look back 24h for an open 'in' session
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const lastRecord = await Attendance.findOne({
      userId,
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: -1 });

    if (type === 'in') {
      if (lastRecord && lastRecord.type === 'in') {
        return NextResponse.json({ error: 'คุณอยู่ในระบบแล้ว (Missing Clock Out?)' }, { status: 400 });
      }
    } else if (type === 'out') {
      if (!lastRecord || lastRecord.type === 'out') {
        return NextResponse.json({ error: 'กรุณาลงเวลาเข้างานก่อน' }, { status: 400 });
      }
    }

    const distance = branchLocation 
      ? getDistance(location.lat, location.lon, branchLocation.lat, branchLocation.lon)
      : 999999;
    
    // Use branch-specific radius with 5m buffer
    const limit = (radius || 50) + 5;
    const isInside = distance <= limit;
    
    // Fetch user name and image from User/Leader model
    const { User } = await import('@/models/User');
    const { Leader } = await import('@/models/Leader');
    
    let userName = 'Unknown';
    let userImage: string | undefined;

    if (mongoose.Types.ObjectId.isValid(userId)) {
      // Try User first (Driver), then Leader
      let person = await User.findById(userId);
      if (!person) person = await Leader.findById(userId);
      
      userName = person?.name || person?.lineDisplayName || 'Unknown';
      userImage = (person as any)?.lineProfileImage;
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
