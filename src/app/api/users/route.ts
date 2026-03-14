import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { User, IUser } from '@/models/User';
import { LeaveRequest } from '@/models/LeaveRequest';
import { SubstituteRecord } from '@/models/SubstituteRecord';
import { requireAuth, requireLeader } from '@/lib/api-auth';
import { triggerPusher, CHANNELS, EVENTS } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const activeOnly = searchParams.get('activeOnly');
    const branch = searchParams.get('branch');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }
    if (activeOnly === 'true') {
      query.status = 'active';
    }
    if (branch) {
      query.branch = branch;
    }

    const users = await User.find(query)
      .select('lineUserId linePublicId lineDisplayName lineProfileImage name surname phone employeeId branch status vacationDays sickDays personalDays performanceTier performancePoints performanceLevel lastSeen isOnline createdAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, name, surname, phone, employeeId, linePublicId, branch, status, vacationDays, sickDays, personalDays, performanceTier } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const updateData: mongoose.UpdateQuery<IUser> = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (phone !== undefined) updateData.phone = phone;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (linePublicId !== undefined) updateData.linePublicId = linePublicId;
    if (status !== undefined) updateData.status = status;
    if (vacationDays !== undefined) updateData.vacationDays = vacationDays;
    if (sickDays !== undefined) updateData.sickDays = sickDays;
    if (personalDays !== undefined) updateData.personalDays = personalDays;
    if (performanceTier !== undefined) updateData.performanceTier = performanceTier;
    if (branch !== undefined) updateData.branch = branch;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (status === 'active') {
      await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_ACTIVATED, { userId: userId });
    }
    await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_UPDATED, { userId: userId });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        lineUserId: user.lineUserId,
        linePublicId: user.linePublicId,
        lineDisplayName: user.lineDisplayName,
        lineProfileImage: user.lineProfileImage,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        employeeId: user.employeeId,
        status: user.status,
        vacationDays: user.vacationDays,
        sickDays: user.sickDays,
        personalDays: user.personalDays,
        performanceTier: user.performanceTier,
        performancePoints: user.performancePoints,
        performanceLevel: user.performanceLevel,
        branch: user.branch,
      },
    });
  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = requireLeader(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending users' }, { status: 400 });
    }

    await SubstituteRecord.deleteMany({ userId });
    await LeaveRequest.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    await triggerPusher(CHANNELS.USERS, EVENTS.DRIVER_DELETED, { userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
