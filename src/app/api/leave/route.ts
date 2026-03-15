import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { LeaveRequest } from '@/models/LeaveRequest';
import { User } from '@/models/User';
import { requireAuth } from '@/lib/api-auth';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');

    await dbConnect();

    const query: Record<string, unknown> = {};
    const { role, branch: userBranch, userId: authUserId } = authResult.payload;

    // Build query based on role
    if (role === 'driver') {
      // Driver: Sees their own leaves + others in their branch
      if (userBranch) {
        // Find users in same branch (case-insensitive)
        const branchUsers = await User.find({ 
          branch: { $regex: new RegExp(`^${userBranch}$`, 'i') } 
        }).select('_id');
        const branchUserIds = branchUsers.map(u => u._id);
        
        const targetIds = [...branchUserIds];
        if (mongoose.Types.ObjectId.isValid(authUserId)) {
          targetIds.push(new mongoose.Types.ObjectId(authUserId) as any);
        }
        query.userId = { $in: targetIds };
      } else if (mongoose.Types.ObjectId.isValid(authUserId)) {
        query.userId = authUserId;
      }
    } else if (role === 'leader' && userBranch) {
      // Leader: sees all leaves in their branch (case-insensitive)
      const branchUsers = await User.find({ branch: { $regex: new RegExp(`^${userBranch}$`, 'i') } }).select('_id');
      const branchUserIds = branchUsers.map(u => u._id);
      
      const targetIds = [...branchUserIds];
      if (mongoose.Types.ObjectId.isValid(authUserId)) {
        targetIds.push(new mongoose.Types.ObjectId(authUserId) as any);
      }
      query.userId = { $in: targetIds };
    } else if (role === 'admin') {
      // Admin: sees all unless explicit branch param provided
      if (branch && branch !== 'all') {
        const branchUsers = await User.find({ branch: { $regex: new RegExp(`^${branch}$`, 'i') } }).select('_id');
        const branchUserIds = branchUsers.map(u => u._id);
        query.userId = { $in: branchUserIds };
      }
    }

    if (userId) {
      query.userId = userId;
    }
    
    // Status filter - if not provided, default to approved for the calendar
    // but allow explicit status filter if provided
    if (status) {
      query.status = status;
    } else if (!userId) {
      // Default for dashboard is approved only
      query.status = 'approved';
    }

    const requests = await LeaveRequest.find(query)
      .populate('userId', 'lineDisplayName employeeId phone name surname lineProfileImage performanceTier performancePoints performanceLevel branch')
      .populate('approvedBy', 'name surname lineDisplayName lineProfileImage performanceTier branch role')
      .sort({ createdAt: -1 });

    // Manual population for admin_root
    const adminRootProfile = {
      _id: 'admin_root',
      name: 'ITL',
      surname: 'Administrator',
      lineDisplayName: 'ITL Administrator',
      role: 'admin',
      status: 'active',
    };

    const populatedRequests = requests.map(req => {
      const obj = req.toObject();
      if (obj.approvedBy === 'admin_root') obj.approvedBy = adminRootProfile;
      return obj;
    });

    const response = NextResponse.json({
      success: true,
      requests: populatedRequests,
    });

    // Prevent caching for real-time leave data
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
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

    await triggerPusher(CHANNELS.LEAVE_REQUESTS, EVENTS.NEW_LEAVE, {
      id: leaveRequest._id.toString(),
      leaveType,
      userName: user?.lineDisplayName || 'Unknown',
    });

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
