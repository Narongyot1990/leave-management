import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/api-auth';
import { AttendanceCorrection } from '@/models/AttendanceCorrection';
import { Attendance } from '@/models/Attendance';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { role, userId, branch: userBranch } = authResult.payload;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    await dbConnect();

    const query: any = {};
    if (role === 'leader') {
      query.userId = userId;
    } else if (role === 'admin') {
      if (status) query.status = status;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const corrections = await AttendanceCorrection.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ success: true, corrections });
  } catch (error) {
    console.error('GET Correction Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { type, requestedTime, reason, location, distance, branch } = body;

    if (!type || !requestedTime || !reason || !location || !branch) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { userId } = authResult.payload;

    await dbConnect();

    // Fetch user name
    const { User } = await import('@/models/User');
    const { Leader } = await import('@/models/Leader');
    let userName = 'Unknown';
    if (mongoose.Types.ObjectId.isValid(userId)) {
      let person = await User.findById(userId);
      if (!person) person = await Leader.findById(userId);
      userName = person?.name || person?.lineDisplayName || 'Unknown';
    } else if (userId === 'admin_root') {
      userName = 'ITL Administrator';
    }

    const correction = await AttendanceCorrection.create({
      userId,
      userName,
      type,
      requestedTime: new Date(requestedTime),
      reason,
      location,
      distance,
      branch,
      status: 'pending'
    });

    // Notify admin via Pusher
    await triggerPusher(CHANNELS.USERS, 'new-correction-request', {
      correction
    });

    return NextResponse.json({ success: true, correction });
  } catch (error) {
    console.error('POST Correction Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { role, userId: adminId } = authResult.payload;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can approve corrections' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, rejectedReason } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing ID or status' }, { status: 400 });
    }

    await dbConnect();

    const correction = await AttendanceCorrection.findById(id);
    if (!correction) {
      return NextResponse.json({ error: 'Correction request not found' }, { status: 404 });
    }

    if (correction.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    correction.status = status;
    correction.approvedBy = adminId as any;
    correction.approvedAt = new Date();
    if (rejectedReason) correction.rejectedReason = rejectedReason;

    await correction.save();

    // If approved, create the actual attendance record
    if (status === 'approved') {
       // Check for User image
       const { User } = await import('@/models/User');
       const { Leader } = await import('@/models/Leader');
       let person = await User.findById(correction.userId);
       if (!person) person = await Leader.findById(correction.userId);
       const userImage = (person as any)?.lineProfileImage;

       await Attendance.create({
         userId: correction.userId,
         userName: correction.userName,
         userImage,
         type: correction.type,
         branch: correction.branch,
         location: correction.location,
         distance: correction.distance,
         isInside: true, // Approved corrections are considered "Verified"
         timestamp: correction.requestedTime
       });

       // Trigger pusher for timeline update
       await triggerPusher(CHANNELS.USERS, 'leader-attendance', {
         record: {
           userId: correction.userId,
           userName: correction.userName,
           type: correction.type,
           timestamp: correction.requestedTime
         }
       });
    }

    return NextResponse.json({ success: true, correction });
  } catch (error) {
    console.error('PATCH Correction Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
