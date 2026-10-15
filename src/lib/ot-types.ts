import { Clock, CalendarOff, Truck, Moon, FileText, type LucideIcon } from 'lucide-react';

/* ==========================================
   INCOME CLAIM TYPE CONFIGURATION
   Single source of truth for the 4 extra-income
   claim types (formerly "OT" only).
   ========================================== */

export interface IncomeClaimTypeMeta {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
}

// Deliberately NOT reusing var(--accent)/var(--warning)/var(--info) etc. —
// those are already claimed by the 4 leave types (vacation/sick/personal/unpaid)
// in leave-types.ts, and this calendar shows both leave and income dots side
// by side, so each income type gets its own hard-coded, non-overlapping hue.
export const INCOME_CLAIM_TYPES: Record<string, IncomeClaimTypeMeta> = {
  ot: {
    value: 'ot',
    label: 'OT (เหมาจ่ายรายวัน)',
    icon: Clock,
    color: '#C026D3',
    bgClass: 'bg-fuchsia-600',
    textClass: 'text-fuchsia-600',
  },
  holiday_work: {
    value: 'holiday_work',
    label: 'ทำงานวันหยุด',
    icon: CalendarOff,
    color: '#F59E0B',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500',
  },
  extra_trip: {
    value: 'extra_trip',
    label: 'วิ่งรอบพิเศษ / ทางไกล',
    icon: Truck,
    color: '#0EA5E9',
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-500',
  },
  night_shift: {
    value: 'night_shift',
    label: 'กะดึก',
    icon: Moon,
    color: '#1E3A8A',
    bgClass: 'bg-blue-900',
    textClass: 'text-blue-900',
  },
};

export const INCOME_CLAIM_TYPE_LIST = Object.values(INCOME_CLAIM_TYPES);

export function getIncomeClaimTypeMeta(value: string): IncomeClaimTypeMeta {
  return INCOME_CLAIM_TYPES[value] ?? {
    value,
    label: value,
    icon: FileText,
    color: 'var(--text-muted)',
    bgClass: 'bg-slate-400',
    textClass: 'text-slate-400',
  };
}
