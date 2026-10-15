import { downloadCsv } from '@/lib/csv-export';
import { getLeaveTypeMeta, getStatusBadge } from '@/lib/leave-types';
import { getIncomeClaimTypeMeta } from '@/lib/ot-types';
import { getWorkDurationLabel } from '@/lib/ot-duration';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';

interface PersonLike {
  name?: string;
  surname?: string;
  lineDisplayName?: string;
  employeeId?: string;
  branch?: string;
}

function personName(p?: PersonLike) {
  if (!p) return '';
  return `${p.name || ''} ${p.surname || ''}`.trim() || p.lineDisplayName || '';
}

export interface LeaveCsvRecord {
  userId?: PersonLike;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  rejectedReason?: string;
  approvedBy?: PersonLike;
  approvedAt?: string;
}

export function exportLeaveHistoryCsv(records: LeaveCsvRecord[], filename: string): boolean {
  if (records.length === 0) return false;

  const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สาขา', 'ประเภทการลา', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'จำนวนวัน', 'สถานะ', 'เหตุผลไม่อนุมัติ', 'ผู้อนุมัติ', 'วันที่อนุมัติ'];
  const rows = records.map((r) => [
    r.userId?.employeeId || '',
    personName(r.userId),
    r.userId?.branch || '',
    getLeaveTypeMeta(r.leaveType).label,
    formatDateThai(r.startDate),
    formatDateThai(r.endDate),
    getLeaveDays(r.startDate, r.endDate),
    getStatusBadge(r.status).label,
    r.rejectedReason || '',
    personName(r.approvedBy),
    r.approvedAt ? formatDateThai(r.approvedAt) : '',
  ]);

  downloadCsv(filename, headers, rows);
  return true;
}

export interface OtCsvRecord {
  userId?: PersonLike;
  claimType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  status: string;
  rejectedReason?: string;
  approvedBy?: PersonLike;
  approvedAt?: string;
}

export function exportOtHistoryCsv(records: OtCsvRecord[], filename: string): boolean {
  if (records.length === 0) return false;

  const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สาขา', 'ประเภทรายได้พิเศษ', 'วันที่', 'เวลาเริ่ม', 'เวลาจบ', 'รวมเวลาทำงาน', 'เหตุผล', 'สถานะ', 'เหตุผลไม่อนุมัติ', 'ผู้อนุมัติ', 'วันที่อนุมัติ'];
  const rows = records.map((r) => [
    r.userId?.employeeId || '',
    personName(r.userId),
    r.userId?.branch || '',
    getIncomeClaimTypeMeta(r.claimType).label,
    formatDateThai(r.date),
    r.startTime || '',
    r.endTime || '',
    getWorkDurationLabel(r.startTime, r.endTime) || '',
    r.reason,
    getStatusBadge(r.status).label,
    r.rejectedReason || '',
    personName(r.approvedBy),
    r.approvedAt ? formatDateThai(r.approvedAt) : '',
  ]);

  downloadCsv(filename, headers, rows);
  return true;
}
