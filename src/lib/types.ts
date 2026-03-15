export interface DriverUser {
  id: string;
  lineUserId?: string;
  linePublicId?: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  status?: string;
  role?: 'driver' | 'leader' | 'admin';
  branch?: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface LeaderUser {
  id: string;
  name: string;
  email: string;
  role?: 'driver' | 'leader' | 'admin';
  branch?: string;
}

export interface LeaveRequestItem {
  _id: string;
  userId: string | {
    _id: string;
    lineDisplayName: string;
    lineProfileImage?: string;
    name?: string;
    surname?: string;
    employeeId?: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  rejectedReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface SubstituteRecordItem {
  _id: string;
  userId: {
    _id?: string;
    lineDisplayName: string;
    employeeId?: string;
  };
  recordType: string;
  date: string;
  description?: string;
  createdAt?: string;
}

// Leave type labels, colors, icons, and status badges are defined in
// @/lib/leave-types.ts (single source of truth).
// Date formatting utilities are in @/lib/date-utils.ts.
