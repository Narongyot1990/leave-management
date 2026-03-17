import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ShiftTemplate } from '@/models/ShiftTemplate';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    await dbConnect();
    const shifts = await ShiftTemplate.find().sort({ createdAt: 1 });
    return NextResponse.json({ success: true, shifts });
  } catch (error) {
    console.error('GET Shifts Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { role, userId } = authResult.payload;
    if (role !== 'admin' && role !== 'leader') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    console.log('POST Shift Template Body:', body);
    const { name, startHour, startMinute, endHour, endMinute, color } = body;
    if (!name || startHour === undefined || endHour === undefined) {
      console.warn('POST Shift Template: Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    await dbConnect();
    const shift = await ShiftTemplate.create({
      name,
      startHour: Number(startHour),
      startMinute: Number(startMinute ?? 0),
      endHour: Number(endHour),
      endMinute: Number(endMinute ?? 0),
      color: color || '#6366f1',
      createdBy: userId,
    });
    return NextResponse.json({ success: true, shift });
  } catch (error) {
    console.error('POST Shifts Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
