import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { User, IUser } from '@/models/User';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, name, surname, phone, employeeId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updateData: mongoose.UpdateQuery<IUser> = {};
    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (phone !== undefined) updateData.phone = phone;
    if (employeeId !== undefined) updateData.employeeId = employeeId;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
