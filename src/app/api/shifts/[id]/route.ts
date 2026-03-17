import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { ShiftTemplate } from '@/models/ShiftTemplate';
import { requireAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { role } = authResult.payload;
    if (role !== 'admin' && role !== 'leader') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    console.log(`PUT Shift Template [${id}] Body:`, body);
    const { name, startHour, startMinute, endHour, endMinute, color } = body;
    await dbConnect();
    const shift = await ShiftTemplate.findByIdAndUpdate(
      id,
      { name, startHour: Number(startHour), startMinute: Number(startMinute ?? 0), endHour: Number(endHour), endMinute: Number(endMinute ?? 0), color },
      { new: true }
    );
    if (!shift) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, shift });
  } catch (error) {
    console.error('PUT Shift Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { role } = authResult.payload;
    if (role !== 'admin' && role !== 'leader') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await dbConnect();
    await ShiftTemplate.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE Shift Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
