import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { SubstituteRecord } from '@/models/SubstituteRecord';
import { requireAuth, requireLeader } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = userId;
    } else if (userId) {
      // Return empty if invalid ID (like admin_root)
      return NextResponse.json({ success: true, records: [] });
    }

    const records = await SubstituteRecord.find(query)
      .populate('userId', 'lineDisplayName employeeId phone name surname lineProfileImage')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    // Manual population for admin_root
    const adminRootProfile = {
      _id: 'admin_root',
      name: 'ITL Administrator',
      role: 'admin',
    };

    const populatedRecords = records.map(rec => {
      const obj = rec.toObject();
      if (obj.createdBy === 'admin_root') obj.createdBy = adminRootProfile;
      return obj;
    });

    return NextResponse.json({
      success: true,
      records: populatedRecords,
    });
  } catch (error) {
    console.error('Get Substitute Records Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireLeader(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { userId, recordType, date, description, createdBy } = body;

    if (!userId || !recordType || !date || !createdBy) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    await dbConnect();

    const record = await SubstituteRecord.create({
      userId,
      recordType,
      date: new Date(date),
      description,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('Create Substitute Record Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
