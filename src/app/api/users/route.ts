import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { User, IUser } from '@/models/User';
import { LeaveRequest } from '@/models/LeaveRequest';
import { SubstituteRecord } from '@/models/SubstituteRecord';
import { pusher } from '@/lib/pusher';
import { requireAuth, requireLeader } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const activeOnly = searchParams.get('activeOnly');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }
    if (activeOnly === 'true') {
      query.status = 'active';
    }

    const users = await User.find(query)
      .select('lineUserId lineDisplayName lineProfileImage name surname phone employeeId status vacationDays sickDays personalDays lastSeen isOnline createdAt')
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
    const { userId, name, surname, phone, employeeId, status, vacationDays, sickDays, personalDays } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const updateData: mongoose.UpdateQuery<IUser> = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (phone !== undefined) updateData.phone = phone;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (status !== undefined) updateData.status = status;
    if (vacationDays !== undefined) updateData.vacationDays = vacationDays;
    if (sickDays !== undefined) updateData.sickDays = sickDays;
    if (personalDays !== undefined) updateData.personalDays = personalDays;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (status === 'active') {
      try {
        await pusher.trigger(`driver-${userId}`, 'driver-activated', {
          message: 'บัญชีของคุณได้รับการยืนยันแล้ว! ตอนนี้คุณสามารถใช้งานระบบได้แล้ว',
        });
      } catch (pusherError) {
        console.error('Pusher Error:', pusherError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        lineUserId: user.lineUserId,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
