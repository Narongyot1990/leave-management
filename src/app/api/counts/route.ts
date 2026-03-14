import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { LeaveRequest } from '@/models/LeaveRequest';
import { User } from '@/models/User';
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

    // Prepare filter based on role and requested branch
    let leaveFilter: any = { status: 'pending' };
    let userFilter: any = { status: { $ne: 'active' } };

    if (role === 'admin') {
      if (filterBranch && filterBranch !== 'all') {
        leaveFilter.branch = filterBranch; // This assumes LeaveRequest has branch, but usually it's in userId
        // Join with User to filter by branch
      }
    } else if (role === 'leader') {
      // Leaders always filtered by their branch
      // We need to find users in that branch first or use populate
    }

    // Since LeaveRequest doesn't have branch directly (usually), we might need to use aggregate or separate queries
    // BUT the current implementation of LeaveRequest model might not have branch.
    // Let's check how users are associated.
    
    // For simplicity, let's just get the users of the branch first.
    let branchUserIds: any[] = [];
    if (role === 'leader' || (role === 'admin' && filterBranch && filterBranch !== 'all')) {
      const targetBranch = role === 'admin' ? filterBranch : userBranch;
      const usersInBranch = await User.find({ branch: targetBranch }).select('_id');
      branchUserIds = usersInBranch.map(u => u._id);
      leaveFilter.userId = { $in: branchUserIds };
      userFilter.branch = targetBranch;
    }

    if (!type || type === 'all') {
      const [pendingLeaves, pendingDrivers] = await Promise.all([
        LeaveRequest.countDocuments(leaveFilter),
        User.countDocuments(userFilter),
      ]);
      return NextResponse.json({
        success: true,
        counts: {
          pendingLeaves,
          pendingDrivers,
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
