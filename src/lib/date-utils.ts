import { dayjs } from './dayjs';

export const ONLINE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function getBangkokTime(): Date {
  return dayjs().tz('Asia/Bangkok').toDate();
}

export function formatDateThai(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShortThai(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
}

export function getLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'ไม่เคยออนไลน์';
  const date = new Date(dateStr);
  const now = getBangkokTime();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'ออนไลน์ตอนนี้';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffWeeks < 4) return `${diffWeeks} สัปดาห์ที่แล้ว`;
  if (diffMonths > 0) return `${diffMonths} เดือนที่แล้ว`;
  return formatDateThai(dateStr);
}

export function isUserOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  const date = new Date(lastSeen);
  const now = getBangkokTime();
  return now.getTime() - date.getTime() < ONLINE_TIMEOUT_MS;
}
