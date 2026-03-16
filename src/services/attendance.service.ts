import mongoose from 'mongoose';
import { Attendance } from '@/models/Attendance';
import { triggerPusher, CHANNELS } from '@/lib/pusher';

export class AttendanceService {
  /**
   * Calculate distance in meters using Haversine formula
   */
  static getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Fetch and merge attendance records and corrections
   */
  static async getUnifiedAttendance(query: any, role: string, range?: string) {
    const limit = (role === 'admin' && range === 'month') ? 2000 : 500;
    
    // 1. Fetch actual attendance records (LEAN for performance)
    const attendanceRecords = await Attendance.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    
    // 2. Fetch attendance corrections
    let corrections: any[] = [];
    const { AttendanceCorrection } = await import('@/models/AttendanceCorrection');
    
    const correctionQuery: any = { status: { $ne: 'approved' } };
    if (query.userId) correctionQuery.userId = query.userId;
    if (query.branch && role === 'admin') correctionQuery.branch = query.branch;
    if (query.timestamp) correctionQuery.requestedTime = query.timestamp;

    corrections = await AttendanceCorrection.find(correctionQuery)
      .sort({ requestedTime: -1 })
      .limit(100)
      .lean();

    // 3. Merge and unify
    return [
      ...attendanceRecords.map(r => ({ ...r, eventType: 'actual' })),
      ...corrections.map(c => ({
        ...c,
        timestamp: c.requestedTime,
        eventType: 'correction'
      }))
    ].sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime());
  }

  /**
   * Handle Clock In/Out action with validation
   */
  static async clockAction(userId: string, body: any) {
    const { type, location, branchCode, branchLocation, radius } = body;

    // Sequence Check (Last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastRecord = await Attendance.findOne({
      userId,
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: -1 }).lean();

    if (type === 'in' && lastRecord?.type === 'in') {
      throw new Error('คุณอยู่ในระบบแล้ว (Missing Clock Out?)');
    }
    if (type === 'out' && (!lastRecord || lastRecord.type === 'out')) {
      throw new Error('กรุณาลงเวลาเข้างานก่อน');
    }

    // Distance Calculation
    const distance = branchLocation 
      ? this.getDistance(location.lat, location.lon, branchLocation.lat, branchLocation.lon)
      : 999999;
    
    const limit = (radius || 50) + 5;
    const isInside = distance <= limit;
    
    // Fetch User Details
    const { User } = await import('@/models/User');
    const { Leader } = await import('@/models/Leader');
    
    let userName = 'Unknown';
    let userImage: string | undefined;

    if (mongoose.Types.ObjectId.isValid(userId)) {
      let person = await User.findById(userId).lean() as any;
      if (!person) person = await Leader.findById(userId).lean();
      
      userName = person?.name || person?.lineDisplayName || 'Unknown';
      userImage = person?.lineProfileImage;
    } else if (userId === 'admin_root') {
      userName = 'ITL Administrator';
    }

    // Create Record
    const record = await Attendance.create({
      userId, userName, userImage, type,
      branch: branchCode, location, distance, isInside,
      timestamp: new Date()
    });

    // Notify Admin via Pusher
    await triggerPusher(CHANNELS.USERS, 'leader-attendance', {
      record: { ...record.toObject(), userName }
    });

    return record;
  }

  /**
   * Unified Delete for Attendance and Corrections
   */
  static async deleteRecord(id: string, requesterId: string, role: string) {
    let record = await Attendance.findById(id);
    let modelType: 'attendance' | 'correction' = 'attendance';

    if (!record) {
      const { AttendanceCorrection } = await import('@/models/AttendanceCorrection');
      record = await AttendanceCorrection.findById(id) as any;
      modelType = 'correction';
    }

    if (!record) throw { message: 'Record not found', status: 404 };

    // Permission check
    if (role !== 'admin' && record.userId.toString() !== requesterId.toString()) {
      throw { message: 'Unauthorized: You can only delete your own records', status: 403 };
    }

    if (modelType === 'attendance') {
      await Attendance.findByIdAndDelete(id);
      
      // Cascading Delete for associated correction
      try {
        const { AttendanceCorrection } = await import('@/models/AttendanceCorrection');
        const timeBuffer = 1000;
        const startTime = new Date(record.timestamp.getTime() - timeBuffer);
        const endTime = new Date(record.timestamp.getTime() + timeBuffer);
        await AttendanceCorrection.deleteMany({
          userId: record.userId,
          type: record.type,
          requestedTime: { $gte: startTime, $lte: endTime }
        });
      } catch (err) { console.error('Cascading Delete Error:', err); }
    } else {
      const { AttendanceCorrection } = await import('@/models/AttendanceCorrection');
      await AttendanceCorrection.findByIdAndDelete(id);
    }
  }
}
