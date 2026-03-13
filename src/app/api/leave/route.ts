import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { LeaveRequest } from '@/models/LeaveRequest';
import { User } from '@/models/User';
import { pusher, CHANNELS } from '@/lib/pusher';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (userId) {
      query.userId = userId;
    }
    if (status) {
      query.status = status;
    }

    const requests = await LeaveRequest.find(query)
      .populate('userId', 'lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Get Leave Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, leaveType, startDate, endDate, reason } = body;

    if (!userId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.name || !user.surname) {
      return NextResponse.json(
        { error: 'Please complete your profile first', code: 'PROFILE_INCOMPLETE' },
        { status: 400 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is pending approval. Please wait for leader to activate.', code: 'USER_NOT_ACTIVE' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlappingLeave = await LeaveRequest.findOne({
      userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlappingLeave) {
      return NextResponse.json(
        { error: 'You already have a leave request for these dates', code: 'OVERLAPPING_LEAVE' },
        { status: 400 }
      );
    }

    const leaveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    if (leaveType === 'vacation' && user.vacationDays < leaveDays) {
      return NextResponse.json(
        { error: `ไม่มีวันลาพักร้อนเพียงพอ (เหลือ ${user.vacationDays} วัน)`, code: 'INSUFFICIENT_QUOTA' },
        { status: 400 }
      );
    }
    if (leaveType === 'sick' && user.sickDays < leaveDays) {
      return NextResponse.json(
        { error: `ไม่มีวันลาป่วยเพียงพอ (เหลือ ${user.sickDays} วัน)`, code: 'INSUFFICIENT_QUOTA' },
        { status: 400 }
      );
    }
    if (leaveType === 'personal' && user.personalDays < leaveDays) {
      return NextResponse.json(
        { error: `ไม่มีวันลากิจเพียงพอ (เหลือ ${user.personalDays} วัน)`, code: 'INSUFFICIENT_QUOTA' },
        { status: 400 }
      );
    }

    const leaveRequest = await LeaveRequest.create({
      userId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      status: 'pending',
    });

    await leaveRequest.populate('userId', 'lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel');

    try {
      await pusher.trigger(CHANNELS.LEAVE_REQUESTS, 'new-leave-request', {
        id: leaveRequest._id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        reason: leaveRequest.reason,
        userName: user?.lineDisplayName || 'Unknown',
        employeeId: user?.employeeId || '',
        createdAt: leaveRequest.createdAt,
      });
    } catch (pusherError) {
      console.error('Pusher Error:', pusherError);
    }

    return NextResponse.json({
      success: true,
      request: leaveRequest,
      remainingQuota: {
        vacationDays: leaveType === 'vacation' ? user.vacationDays - leaveDays : user.vacationDays,
        sickDays: leaveType === 'sick' ? user.sickDays - leaveDays : user.sickDays,
        personalDays: leaveType === 'personal' ? user.personalDays - leaveDays : user.personalDays,
      }
    });
  } catch (error) {
    console.error('Create Leave Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
