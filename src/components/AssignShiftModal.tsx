'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ChevronLeft, ChevronRight, CalendarDays, Users } from 'lucide-react';
import { ShiftTemplate } from './ShiftTemplateModal';

interface WorkEntry {
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  shiftName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

interface StaffUser {
  _id: string;
  name?: string;
  lineDisplayName?: string;
  role?: string;
  branch?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function AssignShiftModal({ open, onClose }: Props) {
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<ShiftTemplate | null>(null);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const fetchShifts = useCallback(async () => {
    const res = await fetch('/api/shifts');
    const data = await res.json();
    if (data.success) setShifts(data.shifts);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/users?activeOnly=true');
    const data = await res.json();
    if (data.success) setUsers(data.users);
  }, []);

  const fetchSchedule = useCallback(async (uid: string) => {
    if (!uid) return;
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/work-schedule?userId=${uid}`);
      const data = await res.json();
      if (data.success && data.schedules.length > 0) {
        setEntries(data.schedules[0].entries || []);
      } else {
        setEntries([]);
      }
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchShifts();
      fetchUsers();
    }
  }, [open, fetchShifts, fetchUsers]);

  useEffect(() => {
    if (selectedUserId) fetchSchedule(selectedUserId);
  }, [selectedUserId, fetchSchedule]);

  // Build calendar grid for current month
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    if (!selectedShift) return;
    const dateStr = toDateStr(year, month, day);
    setEntries(prev => {
      const existing = prev.find(e => e.date === dateStr);
      if (existing && existing.shiftTemplateId === selectedShift._id) {
        // Toggle off: same shift clicked again
        return prev.filter(e => e.date !== dateStr);
      }
      // Assign or overwrite
      const entry: WorkEntry = {
        date: dateStr,
        shiftTemplateId: selectedShift._id,
        shiftName: selectedShift.name,
        startHour: selectedShift.startHour,
        startMinute: selectedShift.startMinute,
        endHour: selectedShift.endHour,
        endMinute: selectedShift.endMinute,
        color: selectedShift.color,
      };
      return [...prev.filter(e => e.date !== dateStr), entry];
    });
  };

  const getEntry = (day: number) => {
    return entries.find(e => e.date === toDateStr(year, month, day)) || null;
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/work-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, entries }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedUserName = users.find(u => u._id === selectedUserId)?.name
    || users.find(u => u._id === selectedUserId)?.lineDisplayName
    || '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
            className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                </div>
                <h2 className="text-[13px] font-black tracking-tighter">ASSIGN WORK SCHEDULE</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--bg-inset)] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* User selector */}
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1.5">พนักงาน</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-40" />
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] pl-9 pr-3 text-[12px] font-bold focus:border-emerald-500 outline-none appearance-none"
                  >
                    <option value="">— เลือกพนักงาน —</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name || u.lineDisplayName} {u.role ? `(${u.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shift Template Buttons */}
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest opacity-40 block mb-1.5">เลือก Shift Template (active แล้วคลิกวันในปฏิทิน)</label>
                {shifts.length === 0 ? (
                  <p className="text-[10px] opacity-30 italic">ยังไม่มี Template — สร้างที่ปุ่ม &quot;Create Template Shift&quot; ก่อน</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {shifts.map(s => {
                      const isActive = selectedShift?._id === s._id;
                      return (
                        <button key={s._id} onClick={() => setSelectedShift(isActive ? null : s)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all"
                          style={{
                            background: isActive ? s.color : s.color + '15',
                            borderColor: isActive ? s.color : s.color + '40',
                            color: isActive ? 'white' : s.color,
                            boxShadow: isActive ? `0 0 10px ${s.color}50` : 'none',
                          }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: isActive ? 'white' : s.color }} />
                          {s.name}
                          <span className="opacity-70">{pad(s.startHour)}:{pad(s.startMinute)}–{pad(s.endHour)}:{pad(s.endMinute)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calendar */}
              <div>
                {/* Month nav */}
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                  <span className="text-[12px] font-black">{MONTHS_TH[month]} {year + 543}</span>
                  <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_TH.map((d, i) => (
                    <div key={d} className={`text-center text-[8px] font-black uppercase pb-1 ${i === 0 ? 'text-rose-500/60' : i === 6 ? 'text-blue-500/60' : 'opacity-30'}`}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {/* Leading blank cells */}
                  {Array.from({ length: firstDow }, (_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const entry = getEntry(day);
                    const dateObj = new Date(year, month, day);
                    const isToday = dateObj.toDateString() === new Date().toDateString();
                    const dow = dateObj.getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    const canClick = !!selectedShift && !!selectedUserId;

                    return (
                      <motion.button
                        key={day}
                        whileTap={canClick ? { scale: 0.9 } : {}}
                        onClick={() => handleDayClick(day)}
                        className={`relative rounded-lg text-center transition-all
                          ${canClick ? 'cursor-pointer hover:ring-1' : 'cursor-default'}
                          ${isToday ? 'ring-1 ring-[var(--accent)]' : ''}
                          ${!entry && isWeekend ? 'opacity-50' : ''}`}
                        style={{
                          paddingTop: 4, paddingBottom: 4,
                          background: entry ? entry.color + '25' : isToday ? 'var(--accent)10' : 'var(--bg-inset)',
                          borderColor: canClick && selectedShift ? selectedShift.color + '60' : undefined,
                        }}
                      >
                        <span className={`text-[10px] font-black block leading-none ${isToday ? 'text-[var(--accent)]' : isWeekend && !entry ? 'opacity-50' : ''}`}>
                          {day}
                        </span>
                        {entry && (
                          <span className="text-[6px] font-black block leading-none mt-0.5 truncate px-0.5" style={{ color: entry.color }}>
                            {pad(entry.startHour)}:{pad(entry.startMinute)}
                          </span>
                        )}
                        {entry && (
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: entry.color }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              {entries.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {shifts.filter(s => entries.some(e => e.shiftTemplateId === s._id)).map(s => {
                    const count = entries.filter(e => e.shiftTemplateId === s._id).length;
                    return (
                      <div key={s._id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black"
                        style={{ background: s.color + '20', color: s.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.name}: {count} วัน
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[var(--border)] flex gap-3 shrink-0">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-[11px] font-black text-[var(--text-muted)] hover:bg-[var(--bg-inset)] transition-colors">
                ปิด
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !selectedUserId}
                className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-40"
              >
                <Save className="w-4 h-4" />
                {saved ? 'บันทึกแล้ว ✓' : saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
