import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Leader } from '@/models/Leader';
import { getCurrentUser } from '@/lib/jwt-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    
    const tokenPayload = await getCurrentUser();
    
    if (!tokenPayload) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    if (tokenPayload.role === 'leader') {
      const leader = await Leader.findById(tokenPayload.userId);
      if (!leader) {
        return NextResponse.json({ 
          success: false, 
          error: 'Leader not found' 
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        user: {
          id: leader._id,
          email: leader.email,
          name: leader.name,
          branch: leader.branch,
          role: 'leader',
        },
      });
    } else if (tokenPayload.role === 'admin') {
      return NextResponse.json({
        success: true,
        user: {
          id: tokenPayload.userId,
          email: tokenPayload.email,
          name: 'ITL Administrator',
          role: 'admin',
        },
      });
    } else if (tokenPayload.role === 'driver') {
      const user = await User.findById(tokenPayload.userId);
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'User found' 
        }, { status: 404 });
      }

      await User.findByIdAndUpdate(tokenPayload.userId, {
        lastSeen: new Date(),
        isOnline: true,
      });
      
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
          branch: user.branch,
          status: user.status,
          vacationDays: user.vacationDays,
          sickDays: user.sickDays,
          personalDays: user.personalDays,
          performanceTier: user.performanceTier,
          performancePoints: user.performancePoints,
          performanceLevel: user.performanceLevel,
          lastSeen: user.lastSeen,
          isOnline: user.isOnline,
          role: 'driver',
        },
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid role' 
    }, { status: 400 });
  } catch (error) {
    console.error('Get Current User Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
