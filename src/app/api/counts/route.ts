import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { LeaveRequest } from '@/models/LeaveRequest';
import { User } from '@/models/User';
import { AttendanceCorrection } from '@/models/AttendanceCorrection';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { role, branch: userBranch } = authResult.payload;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const filterBranch = searchParams.get('branch');

    await dbConnect();

    // For Leave Requests: Filter by branch users (case-insensitive)
    let leaveFilter: any = { status: 'pending' };
    let userFilter: any = { status: { $ne: 'active' } };

    if (role === 'leader' || (role === 'admin' && filterBranch && filterBranch !== 'all')) {
      const targetBranch = role === 'admin' ? filterBranch : userBranch;
      
      if (targetBranch) {
        // Find users in same branch (case-insensitive)
        const usersInBranch = await User.find({ 
          branch: { $regex: new RegExp(`^${targetBranch}$`, 'i') } 
        }).select('_id');
        const branchUserIds = usersInBranch.map(u => u._id);
        
        leaveFilter.userId = { $in: branchUserIds };
        
        // For pending drivers: include target branch (case-insensitive) OR missing branch
        userFilter = {
          $and: [
            { status: { $ne: 'active' } },
            {
              $or: [
                { branch: { $regex: new RegExp(`^${targetBranch}$`, 'i') } },
                { branch: { $exists: false } },
                { branch: '' },
                { branch: null }
              ]
            }
          ]
        };
      }
    }

    if (!type || type === 'all') {
      const [pendingLeaves, pendingDrivers, totalLeaders, activeDrivers, pendingCorrections] = await Promise.all([
        LeaveRequest.countDocuments(leaveFilter),
        User.countDocuments({ role: 'driver', status: 'pending' }),
        User.countDocuments({ role: 'leader' }),
        User.countDocuments({ role: 'driver', status: 'active' }),
        AttendanceCorrection.countDocuments({ status: 'pending' })
      ]);
      return NextResponse.json({
        success: true,
        counts: {
          pendingLeaves,
          pendingDrivers,
          totalLeaders,
          activeDrivers,
          pendingCorrections
        }
      });
    }

    if (type === 'pending_leaves') {
      const count = await LeaveRequest.countDocuments(leaveFilter);
      return NextResponse.json({ success: true, count });
    }

    if (type === 'pending_drivers') {
      const count = await User.countDocuments(userFilter);
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Get Counts Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
