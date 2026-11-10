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
  unpaidDays?: number;
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

export const leaveTypeLabels: Record<string, string> = {
  vacation: 'ลาพักร้อน',
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  unpaid: 'ลากิจ (ไม่ได้รับค่าจ้าง)',
};

export const leaveTypeColors: Record<string, string> = {
  vacation: 'from-[#002B5B] to-[#003870]',
  sick: 'from-red-400 to-red-600',
  personal: 'from-[#00d084] to-[#00a86b]',
  unpaid: 'from-gray-400 to-gray-600',
};

export const leaveTypeIcons: Record<string, string> = {
  vacation: '🏖️',
  sick: '🤒',
  personal: '📋',
  unpaid: '💼',
};

export const statusLabels: Record<string, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
};

export const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const substituteTypeLabels: Record<string, string> = {
  vacation: 'ลาพักร้อน',
  sick: 'ลาป่วย',
  personal: 'ลากิจ',
  unpaid: 'ลากิจ (ไม่ได้รับค่าจ้าง)',
  absent: 'ขาดงาน',
  late: 'มาสาย',
  accident: 'Accident',
  damage: 'ทำสินค้าเสียหาย',
};

export function formatDateThai(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
