import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-utils';
import { AttendanceService } from '@/services/attendance.service';
import { Attendance } from '@/models/Attendance';
import { triggerPusher, CHANNELS } from '@/lib/pusher';
import { 
  ClockInSchema, 
  AttendanceQuerySchema, 
  PatchAttendanceSchema 
} from '@/lib/validations/attendance.schema';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch Unified Attendance Records
 */
export const GET = apiHandler(async ({ req, payload }) => {
  const { searchParams } = new URL(req.url);
  const params = AttendanceQuerySchema.parse(Object.fromEntries(searchParams));
  
  const { role, userId: currentUserId, branch: userBranch } = payload;
  const query: any = {};

  // 1. Role-based Authorization & Scoping
  if (role === 'driver') {
    query.userId = currentUserId;
  } else if (role === 'leader') {
    if (params.userId) query.userId = params.userId;
    else if (userBranch) query.branch = { $regex: new RegExp(`^${userBranch}$`, 'i') };
  } else if (role === 'admin') {
    if (params.userId) query.userId = params.userId;
    if (params.branch) query.branch = params.branch;
    if (params.userName) query.userName = { $regex: new RegExp(params.userName, 'i') };
  }

  // 2. Date Range Handling
  if (params.startDate && params.endDate) {
    query.timestamp = { $gte: new Date(params.startDate), $lte: new Date(params.endDate) };
  } else if (params.date) {
    const baseDate = new Date(params.date);
    let start: Date;
    let end: Date;

    if (params.range === 'month') {
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (params.range === 'week') {
      const dayOfWeek = baseDate.getDay();
      start = new Date(baseDate);
      start.setDate(baseDate.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(baseDate);
      end.setHours(23, 59, 59, 999);
      
      // Lookback for ongoing sessions
      const lastInBefore = await Attendance.findOne({
        ...query,
        type: 'in',
        timestamp: { $lt: start }
      }).sort({ timestamp: -1 }).lean();

      if (lastInBefore) {
        const matchingOut = await Attendance.findOne({
          userId: lastInBefore.userId,
          type: 'out',
          timestamp: { $gt: lastInBefore.timestamp as any, $lt: start }
        }).lean();

        if (!matchingOut) {
          query.timestamp = { $gte: lastInBefore.timestamp, $lte: end };
        } else {
          query.timestamp = { $gte: start, $lte: end };
        }
      } else {
        query.timestamp = { $gte: start, $lte: end };
      }
    }
    if (start && end && !query.timestamp) query.timestamp = { $gte: start, $lte: end };
  }

  const records = await AttendanceService.getUnifiedAttendance(query, role, params.range);
  return NextResponse.json({ success: true, records });
});

/**
 * POST: Clock In / Clock Out
 */
export const POST = apiHandler(async ({ req, payload }) => {
  const body = await req.json();
  const validatedBody = ClockInSchema.parse(body);
  
  const record = await AttendanceService.clockAction(payload.userId, validatedBody);
  return NextResponse.json({ success: true, record });
});

/**
 * DELETE: Remove Attendance or Correction
 */
export const DELETE = apiHandler(async ({ req, payload }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) throw new Error('ID is required');

  await AttendanceService.deleteRecord(id, payload.userId, payload.role);
  return NextResponse.json({ success: true });
});

/**
 * PATCH: Admin Edit Record
 */
export const PATCH = apiHandler(async ({ req, payload }) => {
  if (payload.role !== 'admin') throw { message: 'Only admins can edit records', status: 403 };

  const body = await req.json();
  const { id, ...updateData } = PatchAttendanceSchema.parse(body);

  const update: any = {};
  if (updateData.timestamp) update.timestamp = new Date(updateData.timestamp);
  if (updateData.type) update.type = updateData.type;
  if (updateData.branch) update.branch = updateData.branch;

  const record = await Attendance.findByIdAndUpdate(id, update, { new: true });
  if (!record) throw { message: 'Record not found', status: 404 };

  // Trigger pusher for timeline update
  await triggerPusher(CHANNELS.USERS, 'leader-attendance', {
    record: {
      userId: record.userId,
      userName: record.userName,
      type: record.type,
      timestamp: record.timestamp
    }
  });

  return NextResponse.json({ success: true, record });
});
