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

export const INCOME_CLAIM_TYPES: Record<string, IncomeClaimTypeMeta> = {
  ot: {
    value: 'ot',
    label: 'OT (เหมาจ่ายรายวัน)',
    icon: Clock,
    color: 'var(--accent)',
    bgClass: 'bg-indigo-500',
    textClass: 'text-indigo-500',
  },
  holiday_work: {
    value: 'holiday_work',
    label: 'ทำงานวันหยุด',
    icon: CalendarOff,
    color: 'var(--warning)',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500',
  },
  extra_trip: {
    value: 'extra_trip',
    label: 'วิ่งรอบพิเศษ / ทางไกล',
    icon: Truck,
    color: 'var(--info)',
    bgClass: 'bg-sky-500',
    textClass: 'text-sky-500',
  },
  night_shift: {
    value: 'night_shift',
    label: 'กะดึก',
    icon: Moon,
    color: '#8b5cf6',
    bgClass: 'bg-violet-500',
    textClass: 'text-violet-500',
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
