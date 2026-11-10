export type AppRole = 'driver' | 'leader' | 'admin';

export interface SessionUser {
  id: string;
  email?: string;
  lineUserId?: string;
  linePublicId?: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status?: string;
  role: AppRole;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  unpaidDays?: number;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface LeavePersonSummary {
  _id: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  employeeId?: string;
  phone?: string;
  branch?: string;
  role?: AppRole;
  status?: string;
}

export interface LeaveRequestRecord {
  _id: string;
  userId: LeavePersonSummary;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  rejectedReason?: string;
  approvedBy?: LeavePersonSummary;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
