import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id).select(
      'lineDisplayName lineProfileImage name surname phone employeeId branch status performanceTier performancePoints performanceLevel lastSeen isOnline'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
