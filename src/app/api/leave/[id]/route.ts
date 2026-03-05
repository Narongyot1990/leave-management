import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { LeaveRequest } from '@/models/LeaveRequest';
import { User, IUser } from '@/models/User';
import { pusher } from '@/lib/pusher';
import { requireAuth, requireLeader } from '@/lib/api-auth';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    if (leaveRequest.userId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (leaveRequest.status === 'rejected' || leaveRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot cancel this leave request' },
        { status: 400 }
      );
    }

    if (leaveRequest.status === 'approved') {
      const user = await User.findById(userId);
      if (user) {
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const leaveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const quotaUpdate: mongoose.UpdateQuery<IUser> = {};
        if (leaveRequest.leaveType === 'vacation') {
          quotaUpdate.vacationDays = user.vacationDays + leaveDays;
        } else if (leaveRequest.leaveType === 'sick') {
          quotaUpdate.sickDays = user.sickDays + leaveDays;
        } else if (leaveRequest.leaveType === 'personal') {
          quotaUpdate.personalDays = user.personalDays + leaveDays;
        }

        await User.findByIdAndUpdate(userId, quotaUpdate);
      }
    }

    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    const response: { success: boolean; message: string; remainingQuota?: { vacationDays: number; sickDays: number; personalDays: number } } = {
      success: true,
      message: 'Leave request cancelled',
    };

    if (leaveRequest.status === 'cancelled') {
      const user = await User.findById(userId);
      if (user) {
        response.remainingQuota = {
          vacationDays: user.vacationDays,
          sickDays: user.sickDays,
          personalDays: user.personalDays,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Cancel Leave Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireLeader(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    const body = await request.json();
    const { status, approvedBy, rejectedReason } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !rejectedReason) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ' },
        { status: 400 }
      );
    }

    await dbConnect();

    const leaveRequest = await LeaveRequest.findById(id).populate('userId');

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    if (status === 'approved') {
      const user = await User.findById(leaveRequest.userId);
      if (user) {
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const leaveDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const quotaUpdate: mongoose.UpdateQuery<IUser> = {};
        if (leaveRequest.leaveType === 'vacation') {
          quotaUpdate.vacationDays = Math.max(0, user.vacationDays - leaveDays);
        } else if (leaveRequest.leaveType === 'sick') {
          quotaUpdate.sickDays = Math.max(0, user.sickDays - leaveDays);
        } else if (leaveRequest.leaveType === 'personal') {
          quotaUpdate.personalDays = Math.max(0, user.personalDays - leaveDays);
        }

        await User.findByIdAndUpdate(user._id, quotaUpdate);
      }
    }

    leaveRequest.status = status;
    leaveRequest.approvedBy = approvedBy;
    leaveRequest.approvedAt = new Date();
    if (status === 'rejected' && rejectedReason) {
      leaveRequest.rejectedReason = rejectedReason;
    }
    await leaveRequest.save();

    const userId = leaveRequest.userId as unknown as mongoose.Types.ObjectId;
    try {
      await pusher.trigger(`driver-${userId._id}`, 'leave-status-changed', {
        id: leaveRequest._id,
        status: status,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        reason: leaveRequest.reason,
        approvedAt: leaveRequest.approvedAt,
      });
    } catch (pusherError) {
      console.error('Pusher Error:', pusherError);
    }

    return NextResponse.json({
      success: true,
      request: leaveRequest,
    });
  } catch (error) {
    console.error('Update Leave Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
