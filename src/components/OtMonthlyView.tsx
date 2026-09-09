'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { getStatusBadge } from '@/lib/leave-types';
import { buildDateKey, otMatchesDateKey } from '@/lib/leave-calendar';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const THAI_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export interface OtMonthlyRecord {
  _id: string;
  date: string | Date;
  status: string;
  photoUrl?: string;
}

interface OtMonthlyViewProps {
  records: OtMonthlyRecord[];
  onViewPhoto: (url: string) => void;
  loading?: boolean;
}

export default function OtMonthlyView({ records, onViewPhoto, loading }: OtMonthlyViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const recordsByDay = useMemo(() => {
    const map = new Map<number, OtMonthlyRecord>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = buildDateKey(year, month, day);
      const match = records.find((r) => r.status !== 'cancelled' && otMatchesDateKey(r.date, dateKey));
      if (match) map.set(day, match);
    }
    return map;
  }, [records, year, month, daysInMonth]);

  const approvedCount = Array.from(recordsByDay.values()).filter((r) => r.status === 'approved').length;

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center justify-between">
        <button type="button" onClick={goToPrevMonth} className="btn btn-ghost w-9 h-9 p-0">
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        </button>
        <span className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {THAI_MONTHS[month]} {year + 543}
        </span>
        <button type="button" onClick={goToNextMonth} className="btn btn-ghost w-9 h-9 p-0">
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        </button>
      </div>

      <div className="card p-3 text-center">
        <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
          ทำ OT เดือนนี้ <span className="font-bold" style={{ color: 'var(--accent)' }}>{approvedCount}</span> วัน
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : (
          Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day, index) => {
            const record = recordsByDay.get(day);
            const weekday = THAI_WEEKDAYS_SHORT[new Date(year, month, day).getDay()];
            const badge = record ? getStatusBadge(record.status) : null;

            return (
              <div
                key={day}
                className="flex items-center justify-between px-3.5 py-2.5"
                style={index < daysInMonth - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
              >
                <span className="text-fluid-sm" style={{ color: record ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {day} {weekday}
                </span>
                <div className="flex items-center gap-2">
                  {badge ? (
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  ) : (
                    <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>–</span>
                  )}
                  {record?.photoUrl && (
                    <button
                      type="button"
                      onClick={() => onViewPhoto(record.photoUrl as string)}
                      className="btn btn-ghost w-7 h-7 p-0 min-h-0 min-w-0"
                    >
                      <ImageIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
