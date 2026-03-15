import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Leader } from '@/models/Leader';
import bcrypt from 'bcryptjs';
import { requireAuth, requireSuperuser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    // Check auth first
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { leaderId, name, branch, currentPassword, newPassword, role } = body;

    if (!leaderId) {
      return NextResponse.json({ error: 'Leader ID is required' }, { status: 400 });
    }

    if (leaderId === 'admin_root') {
      return NextResponse.json({ 
        success: true, 
        message: 'Root administrator profile is managed via system configuration.',
        leader: { id: 'admin_root', name: 'ITL Administrator', role: 'admin' }
      });
    }

    await dbConnect();

    // Check User model first (Refactored Unified System)
    let userRecord = await User.findById(leaderId);
    let isLegacyLeader = false;

    if (!userRecord) {
      // Check legacy Leader model
      userRecord = await Leader.findById(leaderId) as any;
      isLegacyLeader = true;
    }

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 0 });
    }

    const { surname, phone, employeeId } = body;
    if (surname !== undefined) userRecord.surname = surname;
    if (phone !== undefined) userRecord.phone = phone;
    if (employeeId !== undefined) userRecord.employeeId = employeeId;

    if (currentPassword && newPassword) {
      const isValid = await bcrypt.compare(currentPassword, (userRecord as any).password);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
          { status: 400 }
        );
      }

      (userRecord as any).password = await bcrypt.hash(newPassword, 12);
    } else if (newPassword && !currentPassword) {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสผ่านปัจจุบัน' },
        { status: 400 }
      );
    }

    await (userRecord as any).save();

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord._id,
        name: userRecord.name,
        surname: userRecord.surname,
        phone: userRecord.phone,
        employeeId: userRecord.employeeId,
        branch: userRecord.branch,
        role: userRecord.role,
      },
    });
  } catch (error) {
    console.error('Update Leader Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
