import { Umbrella, Thermometer, Briefcase, Ban, FileText, ClipboardList, CalendarDays, type LucideIcon } from 'lucide-react';

/* ==========================================
   LEAVE TYPE CONFIGURATION
   Single source of truth for all leave-related
   labels, icons, colors, and mappings.
   ========================================== */

export interface LeaveTypeMeta {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
  daysKey: 'vacationDays' | 'sickDays' | 'personalDays' | null;
}

export const LEAVE_TYPES: Record<string, LeaveTypeMeta> = {
  vacation: {
    value: 'vacation',
    label: 'ลาพักร้อน',
    icon: Umbrella,
    color: 'var(--accent)',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-500',
    daysKey: 'vacationDays',
  },
  sick: {
    value: 'sick',
    label: 'ลาป่วย',
    icon: Thermometer,
    color: 'var(--danger)',
    bgClass: 'bg-red-400',
    textClass: 'text-red-400',
    daysKey: 'sickDays',
  },
  personal: {
    value: 'personal',
    label: 'ลากิจ',
    icon: Briefcase,
    color: 'var(--success)',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500',
    daysKey: 'personalDays',
  },
  unpaid: {
    value: 'unpaid',
    label: 'ลากิจ (ไม่ได้รับค่าจ้าง)',
    icon: Ban,
    color: 'var(--text-muted)',
    bgClass: 'bg-slate-400',
    textClass: 'text-slate-400',
    daysKey: null,
  },
};

export const LEAVE_TYPE_LIST = Object.values(LEAVE_TYPES);

export function getLeaveTypeMeta(leaveType: string): LeaveTypeMeta {
  return LEAVE_TYPES[leaveType] ?? {
    value: leaveType,
    label: leaveType,
    icon: FileText,
    color: 'var(--text-muted)',
    bgClass: 'bg-slate-400',
    textClass: 'text-slate-400',
    daysKey: null,
  };
}

export function getLeaveTypeLabel(leaveType: string): string {
  return LEAVE_TYPES[leaveType]?.label ?? leaveType;
}

/* ==========================================
   SUBSTITUTE / RECORD TYPE CONFIGURATION
   ========================================== */

export interface RecordTypeMeta {
  value: string;
  label: string;
}

export const RECORD_TYPES: RecordTypeMeta[] = [
  { value: 'vacation', label: 'ลาพักร้อน' },
  { value: 'sick', label: 'ลาป่วย' },
  { value: 'personal', label: 'ลากิจ' },
  { value: 'unpaid', label: 'ลาไม่รับค่าจ้าง' },
  { value: 'absent', label: 'ขาดงาน' },
  { value: 'late', label: 'มาสาย' },
  { value: 'accident', label: 'Accident' },
  { value: 'damage', label: 'ทำสินค้าเสียหาย' },
];

export const RECORD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RECORD_TYPES.map((r) => [r.value, r.label])
);

export function getRecordTypeLabel(recordType: string): string {
  return RECORD_TYPE_LABELS[recordType] ?? recordType;
}

/* ==========================================
   STATUS BADGE CONFIGURATION
   ========================================== */

export interface StatusBadgeMeta {
  cls: string;
  label: string;
}

export const STATUS_BADGES: Record<string, StatusBadgeMeta> = {
  pending: { cls: 'badge-warning', label: 'รออนุมัติ' },
  approved: { cls: 'badge-success', label: 'อนุมัติ' },
  rejected: { cls: 'badge-danger', label: 'ไม่อนุมัติ' },
  cancelled: { cls: 'badge-info', label: 'ยกเลิก' },
};

export function getStatusBadge(status: string): StatusBadgeMeta {
  return STATUS_BADGES[status] ?? { cls: 'badge-info', label: status };
}
