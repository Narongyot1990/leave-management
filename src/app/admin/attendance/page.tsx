'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, ChevronLeft, ChevronRight, History as HistoryIcon, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CalendarDays, Link, Unlink, LayoutGrid, Calendar } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';
import BottomNav from '@/components/BottomNav';
import { TIMELINE_CONFIG, ZoomLevel } from '@/lib/timeline-config';
import ShiftTemplateModal from '@/components/ShiftTemplateModal';
import AssignShiftModal from '@/components/AssignShiftModal';

interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  type: 'in' | 'out';
  timestamp: string;
  branch: string;
  location: { lat: number; lon: number };
  distance: number;
  isInside: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: string;
  branch: string;
  isLate: boolean;
}

interface TimelineUser {
  id: string;
  name: string;
  image?: string;
  branch?: string;
  role?: string;
  sessions: { start: Date; end: Date | null; branch: string; isLate: boolean }[];
}

export default function AttendanceMonitorPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(TIMELINE_CONFIG.ZOOM.LEVELS[TIMELINE_CONFIG.ZOOM.DEFAULT]);
  const [zoomValue, setZoomValue] = useState<number>(TIMELINE_CONFIG.ZOOM.DEFAULT);
  const [viewDate, setViewDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'leader'>('all');
  const [syncScroll, setSyncScroll] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [workSchedules, setWorkSchedules] = useState<Record<string, { date: string; color: string; startHour: number; startMinute: number; endHour: number; endMinute: number }[]>>({});

  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSyncingRef = useRef(false);

  // ---------- Data Fetching ----------
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(TIMELINE_CONFIG.API.USERS);
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.error('Fetch Users Error:', err);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const d = new Date(viewDate);
      // Always fetch the full month so all zoom levels have data
      d.setDate(1);
      const dateStr = d.toISOString().split('T')[0];
      const res = await fetch(`${TIMELINE_CONFIG.API.ATTENDANCE}?date=${dateStr}&range=month`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  useEffect(() => {
    fetchUsers();
    fetchRecords();
  }, [fetchUsers, fetchRecords]);

  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.ATTENDANCE_EVENT, callback: fetchRecords }], true);
  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.DRIVER_UPDATED_EVENT, callback: fetchUsers }], true);

  const fetchWorkSchedules = useCallback(async () => {
    try {
      const month = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/work-schedule?month=${month}`);
      const data = await res.json();
      if (data.success) {
        const map: typeof workSchedules = {};
        data.schedules.forEach((s: any) => {
          map[s.userId] = s.entries;
        });
        setWorkSchedules(map);
      }
    } catch (err) { console.error(err); }
  }, [viewDate]);

  useEffect(() => { fetchWorkSchedules(); }, [fetchWorkSchedules]);

  // ---------- Zoom & Navigation ----------
  const handleZoomChange = useCallback((newValue: number) => {
    const v = Math.max(TIMELINE_CONFIG.ZOOM.MIN, Math.min(TIMELINE_CONFIG.ZOOM.MAX, newValue));
    setZoomValue(v);
    setZoomLevel(TIMELINE_CONFIG.ZOOM.LEVELS[v]);
  }, []);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const d = new Date(viewDate);
    const delta = direction === 'next' ? 1 : -1;
    if (zoomLevel === 'month') {
      d.setMonth(d.getMonth() + delta);
    } else {
      // Day and Hour views navigate by day
      d.setDate(d.getDate() + delta);
    }
    setViewDate(d);
  }, [viewDate, zoomLevel]);

  const goToToday = useCallback(() => setViewDate(new Date()), []);

  // ---------- Process Timeline Data ----------
  const timelineData = useMemo<TimelineUser[]>(() => {
    const userMap = new Map<string, TimelineUser>();

    users.forEach(u => {
      userMap.set(u._id, {
        id: u._id,
        name: u.name || u.lineDisplayName || 'Unknown',
        image: u.lineProfileImage,
        branch: u.branch,
        role: u.role,
        sessions: [],
      });
    });

    const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sorted.forEach(rec => {
      if (!userMap.has(rec.userId)) {
        userMap.set(rec.userId, { id: rec.userId, name: rec.userName, image: rec.userImage, sessions: [] });
      }
      const ud = userMap.get(rec.userId)!;
      if (rec.type === 'in') {
        const startTime = new Date(rec.timestamp);
        const expectedStart = new Date(startTime);
        expectedStart.setHours(TIMELINE_CONFIG.SCHEDULE.EXPECTED_START, TIMELINE_CONFIG.SCHEDULE.LATE_THRESHOLD_MINUTES, 0, 0);
        const isLate = startTime > expectedStart;
        ud.sessions.push({ start: startTime, end: null, branch: rec.branch, isLate });
      } else {
        const last = ud.sessions[ud.sessions.length - 1];
        if (last && !last.end) last.end = new Date(rec.timestamp);
      }
    });

    return Array.from(userMap.values());
  }, [users, records]);

  // ---------- Filtered Timeline Data ----------
  const filteredTimelineData = useMemo(() => {
    if (roleFilter === 'all') return timelineData;
    return timelineData.filter(u => u.role === roleFilter);
  }, [timelineData, roleFilter]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const working = filteredTimelineData.filter(u => u.sessions.some(s => !s.end)).length;
    const late = filteredTimelineData.filter(u => u.sessions.some(s => s.isLate)).length;
    const totalHours = filteredTimelineData.reduce((acc, u) =>
      acc + u.sessions.reduce((sa, s) => {
        if (s.start && s.end) return sa + (s.end.getTime() - s.start.getTime()) / 3600000;
        return sa;
      }, 0), 0);
    return { working, total: filteredTimelineData.length, late, totalHours: totalHours.toFixed(1) };
  }, [filteredTimelineData]);

  // ---------- Position Calculations ----------
  const getBarPosition = useCallback((start: Date, end: Date | null, vd: Date, zoom: ZoomLevel) => {
    const now = new Date();
    const daysInMonth = new Date(vd.getFullYear(), vd.getMonth() + 1, 0).getDate();

    if (zoom === 'month') {
      // Month view: position across all days of the month
      if (start.getMonth() !== vd.getMonth() || start.getFullYear() !== vd.getFullYear()) return { left: -1, width: 0 };
      const startD = start.getDate() - 1 + start.getHours() / 24;
      const effectiveEnd = end || (now.getMonth() === vd.getMonth() && now.getFullYear() === vd.getFullYear() ? now : new Date(vd.getFullYear(), vd.getMonth(), daysInMonth, 23, 59));
      const endD = effectiveEnd.getDate() - 1 + effectiveEnd.getHours() / 24;
      return { left: Math.max(0, (startD / daysInMonth) * 100), width: Math.max(0.3, ((endD - startD) / daysInMonth) * 100) };
    } else {
      // Day & Hour views: only show sessions from the selected day
      const sameDay = start.getDate() === vd.getDate() && start.getMonth() === vd.getMonth() && start.getFullYear() === vd.getFullYear();
      if (!sameDay) return { left: -1, width: 0 };

      const startHour = start.getHours() + start.getMinutes() / 60;
      const effectiveEnd = end || now;
      const endHour = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
      // Position as fraction of 24 hours
      const left = Math.max(0, (startHour / 24) * 100);
      const width = Math.max(0.5, ((endHour - startHour) / 24) * 100);
      return { left, width };
    }
  }, []);

  // ---------- Column Headers ----------
  const columnHeaders = useMemo(() => {
    if (zoomLevel === 'month') {
      const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday = d.toDateString() === new Date().toDateString();
        return { label: String(i + 1), isWeekend, isToday, key: `d${i}`, type: 'day' as const };
      });
    } else if (zoomLevel === 'day') {
      // Day view: 6 periods of 4 hours each
      const isToday = viewDate.toDateString() === new Date().toDateString();
      const now = new Date();
      const periods = [
        { label: '00-04', start: 0 },
        { label: '04-08', start: 4 },
        { label: '08-12', start: 8 },
        { label: '12-16', start: 12 },
        { label: '16-20', start: 16 },
        { label: '20-24', start: 20 },
      ];
      return periods.map((p, i) => {
        const isNowPeriod = isToday && now.getHours() >= p.start && now.getHours() < p.start + 4;
        const isWorkHour = p.start < TIMELINE_CONFIG.SCHEDULE.EXPECTED_END && p.start + 4 > TIMELINE_CONFIG.SCHEDULE.EXPECTED_START;
        return {
          label: p.label,
          isWeekend: false,
          isToday,
          isNowHour: isNowPeriod,
          isWorkHour,
          key: `p${i}`,
          type: 'period' as const,
        };
      });
    } else {
      // Hour view: 24 individual hour columns
      const headers: { label: string; isWeekend: boolean; isToday: boolean; isNowHour: boolean; isWorkHour: boolean; key: string; type: 'hour'; hour: number }[] = [];
      const isToday = viewDate.toDateString() === new Date().toDateString();
      const now = new Date();
      for (let h = 0; h < 24; h++) {
        const isNowHour = isToday && now.getHours() === h;
        const isWorkHour = h >= TIMELINE_CONFIG.SCHEDULE.EXPECTED_START && h < TIMELINE_CONFIG.SCHEDULE.EXPECTED_END;
        headers.push({
          label: String(h).padStart(2, '0'),
          isWeekend: false,
          isToday,
          isNowHour,
          isWorkHour,
          key: `h${h}`,
          type: 'hour',
          hour: h,
        });
      }
      return headers;
    }
  }, [zoomLevel, viewDate]);

  // ---------- Date Display ----------
  const dateRangeLabel = useMemo(() => {
    if (zoomLevel === 'month') return viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    if (zoomLevel === 'day') return viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    return viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [zoomLevel, viewDate]);

  const isZoomMin = zoomValue === TIMELINE_CONFIG.ZOOM.MIN;
  const isZoomMax = zoomValue === TIMELINE_CONFIG.ZOOM.MAX;

  // Column sizing
  const colMinWidth = zoomLevel === 'month' ? 32 : zoomLevel === 'day' ? 80 : 42;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      {/* Mobile Fixed Profile Bar */}
      <div className="md:hidden fixed left-0 top-20 bottom-16 w-12 bg-[var(--bg-surface)] border-r border-[var(--border)] z-30 overflow-y-auto">
        <div className="py-2 space-y-1">
          {filteredTimelineData.map((user) => {
            const isActive = user.sessions.some(s => !s.end);
            const isSelected = selectedUser === user.id;
            return (
              <button
                key={user.id}
                onClick={() => setSelectedUser(isSelected ? null : user.id)}
                className={`w-full flex items-center justify-center p-2 transition-colors relative
                  ${isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--bg-inset)]/50'}`}
                title={user.name}
              >
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-emerald-500/40' : ''}`}>
                    {user.image ? (
                      <img src={user.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-[11px] font-black ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {isActive && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-surface)] animate-pulse" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lg:pl-[240px] md:pl-0 pl-12 flex-1 flex flex-col min-h-0">

        {/* ========== HEADER ========== */}
        <header className="px-3 md:px-5 py-2.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-[14px] md:text-[16px] font-black tracking-tighter leading-none">TIMELINE MONITOR</h1>
                <span className="text-[7px] font-black uppercase tracking-widest opacity-30 px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border)] hidden sm:inline">v4.0</span>
              </div>
              <p className="text-[8px] font-bold opacity-25 uppercase tracking-widest mt-0.5 hidden sm:block">Real-time Attendance System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center bg-[var(--bg-inset)] rounded-xl p-0.5 border border-[var(--border)]">
              <button onClick={() => handleZoomChange(zoomValue - 1)} disabled={isZoomMin}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-20">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              {TIMELINE_CONFIG.ZOOM.LABELS.map((lbl, idx) => (
                <button key={lbl} onClick={() => handleZoomChange(idx)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${zoomValue === idx
                    ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                  {lbl}
                </button>
              ))}
              <button onClick={() => handleZoomChange(zoomValue + 1)} disabled={isZoomMax}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-20">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-6 bg-[var(--border)] hidden md:block" />

            {/* Live Stats */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 block leading-none">Active</span>
                <span className="text-sm font-black leading-none">{stats.working}<span className="text-[10px] opacity-40">/{stats.total}</span></span>
              </div>
              {stats.late > 0 && (
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 block leading-none">Late</span>
                  <span className="text-sm font-black text-amber-500 leading-none">{stats.late}</span>
                </div>
              )}
            </div>

            <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
              title="Activity Log">
              <HistoryIcon className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        {/* ========== FILTER + SCROLL MODE BAR ========== */}
        <div className="px-3 md:px-5 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-inset)]/40 shrink-0">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['all', 'driver', 'leader'] as const).map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${roleFilter === f
                  ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {f === 'all' ? `All (${timelineData.length})` : f === 'driver' ? `Driver (${timelineData.filter(u => u.role === 'driver').length})` : `Leader (${timelineData.filter(u => u.role === 'leader').length})`}
              </button>
            ))}
          </div>

          {/* Right side: Shift buttons + Sync toggle */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowShiftModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/8 text-indigo-500 hover:bg-indigo-500/15 transition-all"
              title="Create / Manage Shift Templates">
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/8 text-emerald-500 hover:bg-emerald-500/15 transition-all"
              title="Assign Working Date/Time">
              <Calendar className="w-3 h-3" />
              <span className="hidden sm:inline">Assign Shift</span>
            </button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button onClick={() => setSyncScroll(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${syncScroll
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)]'}`}
              title={syncScroll ? 'Synced scroll — all rows move together' : 'Free scroll — each row independent'}>
              {syncScroll ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
              <span className="hidden sm:inline">{syncScroll ? 'Synced' : 'Free'}</span>
            </button>
          </div>
        </div>

        {/* ========== CONTROLS BAR ========== */}
        <div className="px-3 md:px-5 py-2 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigateDate('prev')}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday}
              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Today
            </button>
            <button onClick={() => navigateDate('next')}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] md:text-[13px] font-black text-[var(--text-primary)]">{dateRangeLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-bold opacity-40">
            <span className="hidden md:inline uppercase tracking-widest">
              {zoomLevel === 'month' ? `${columnHeaders.length} Days` : zoomLevel === 'day' ? '2 Periods' : '24 Hours'}
            </span>
          </div>
        </div>

        {/* ========== HISTORY PANEL ========== */}
        <AnimatePresence>
          {isHistoryExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
              <div className="px-3 md:px-5 py-3 bg-[var(--bg-inset)]/50 border-b border-[var(--border)]">
                <h3 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Recent Activity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {records.slice(0, TIMELINE_CONFIG.DISPLAY.HISTORY_RECORDS_COUNT).map(r => (
                    <div key={r._id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                      <UserAvatar imageUrl={r.userImage} displayName={r.userName} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black truncate">{r.userName}</p>
                        <p className="text-[8px] font-bold opacity-40">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.type.toUpperCase()}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.type === 'in' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
                    </div>
                  ))}
                  {records.length === 0 && <p className="text-[10px] opacity-30 italic col-span-full py-4 text-center">No records</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== TIMELINE GANTT ========== */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Column Headers */}
          <div className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)]">
            {/* Staff column header - hidden on mobile */}
            <div className="hidden md:flex w-[140px] md:w-[180px] shrink-0 border-r border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 items-center px-3 py-2 sticky left-0 z-20">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Staff ({filteredTimelineData.length})</span>
            </div>
            {/* Timeline column headers */}
            <div
              className="flex-1 overflow-x-auto custom-scrollbar"
              ref={scrollContainerRef}
              onScroll={(e) => {
                if (isSyncingRef.current) return;
                isSyncingRef.current = true;
                const scrollLeft = e.currentTarget.scrollLeft;
                rowScrollRefs.current.forEach((el) => {
                  el.scrollLeft = scrollLeft;
                });
                isSyncingRef.current = false;
              }}
            >
              <div className="flex min-w-max">
                {columnHeaders.map(col => (
                  <div key={col.key}
                    className={`flex items-center justify-center py-2 border-r border-[var(--border)]/20 transition-colors
                      ${'isWeekend' in col && col.isWeekend ? 'bg-rose-50/50 dark:bg-rose-950/15' : ''}
                      ${'isToday' in col && col.isToday ? 'bg-[var(--accent)]/8' : ''}
                      ${'isNowHour' in col && col.isNowHour ? 'bg-[var(--accent)]/10' : ''}`}
                    style={{ minWidth: colMinWidth, width: colMinWidth }}>
                    <span className={`text-[8px] md:text-[9px] font-black
                      ${'isWeekend' in col && col.isWeekend ? 'text-rose-500' : ''}
                      ${'isToday' in col && col.isToday ? 'text-[var(--accent)]' : ''}
                      ${'isNowHour' in col && col.isNowHour ? 'text-[var(--accent)]' : ''}
                      ${!('isWeekend' in col && col.isWeekend) && !('isToday' in col && col.isToday) && !('isNowHour' in col && col.isNowHour) ? 'text-slate-400' : ''}`}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Rows */}
          <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar">
            {loading && timelineData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center opacity-40">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-widest">Loading...</p>
                </div>
              </div>
            ) : timelineData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center opacity-40 p-10">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-[12px] font-black uppercase tracking-widest">No Staff Found</p>
                  <p className="text-[10px] font-bold mt-2 opacity-60">Activate users to start monitoring attendance</p>
                </div>
              </div>
            ) : (
              filteredTimelineData.map((user, userIdx) => {
                const isActive = user.sessions.some(s => !s.end);
                const hasLate = user.sessions.some(s => s.isLate);
                const noActivity = user.sessions.length === 0;
                const isSelected = selectedUser === user.id;

                return (
                  <div key={user.id}
                    className={`flex border-b border-[var(--border)]/20 group transition-colors min-h-[52px] cursor-pointer hover:bg-[var(--bg-inset)]/30
                      ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                    onClick={() => setSelectedUser(isSelected ? null : user.id)}>

                    {/* Staff Info (sticky left) - hidden on mobile */}
                    <div className="hidden md:flex w-[140px] md:w-[180px] shrink-0 px-2 py-1.5 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 items-center gap-2 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      <div className="relative shrink-0">
                        <div className={`w-8 h-8 rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-emerald-500/40' : ''}`}>
                          {user.image ? (
                            <img src={user.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-[11px] font-black ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {isActive && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-surface)] animate-pulse" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-[11px] font-black truncate">{user.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {hasLate && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                          <span className={`text-[7px] md:text-[8px] font-bold uppercase truncate ${isActive ? 'text-emerald-500' : hasLate ? 'text-amber-500' : 'opacity-30'}`}>
                            {isActive ? 'Active' : noActivity ? 'Absent' : hasLate ? 'Late' : 'Off duty'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Track */}
                    <div className="flex-1 relative overflow-x-auto custom-scrollbar"
                      ref={(el) => {
                        if (el) rowScrollRefs.current.set(user.id, el);
                        else rowScrollRefs.current.delete(user.id);
                      }}
                      onScroll={(e) => {
                        if (isSyncingRef.current) return;
                        if (syncScroll) {
                          isSyncingRef.current = true;
                          const scrollLeft = e.currentTarget.scrollLeft;
                          if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = scrollLeft;
                          rowScrollRefs.current.forEach((el, id) => {
                            if (id !== user.id) el.scrollLeft = scrollLeft;
                          });
                          isSyncingRef.current = false;
                        } else {
                          if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}>
                      <div className="relative h-full min-h-[52px]" style={{ minWidth: columnHeaders.length * colMinWidth }}>
                        {/* Assigned shift backgrounds from workSchedules */}
                        {(() => {
                          const userSched = workSchedules[user.id] || [];
                          return userSched.map((entry) => {
                            const entryDate = new Date(entry.date);
                            const day = entryDate.getDate();
                            
                            if (zoomLevel === 'month') {
                              // month view: position by day
                              const startD = day - 1 + entry.startHour / 24;
                              const endD = entry.endHour < entry.startHour
                                ? day + entry.endHour / 24  // overnight: next day
                                : day - 1 + entry.endHour / 24;
                              const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                              return (
                                <div key={entry.date} className="absolute top-0 bottom-0 pointer-events-none rounded-sm"
                                  style={{
                                    left: `${(startD / daysInMonth) * 100}%`,
                                    width: `${Math.max(0.5, ((endD - startD) / daysInMonth) * 100)}%`,
                                    background: entry.color + '22',
                                    borderLeft: `2px solid ${entry.color}60`,
                                  }} />
                              );
                            } else {
                              // day & hour views: only show if this is the selected day
                              const sameDay = day === viewDate.getDate() && entryDate.getMonth() === viewDate.getMonth();
                              if (!sameDay) return null;
                              const left = (entry.startHour / 24) * 100;
                              const dur = entry.endHour < entry.startHour
                                ? (24 - entry.startHour + entry.endHour)
                                : (entry.endHour - entry.startHour);
                              const width = Math.max(0.5, (dur / 24) * 100);
                              return (
                                <div key={entry.date} className="absolute top-0 bottom-0 pointer-events-none rounded-sm"
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    background: entry.color + '20',
                                    borderLeft: `2px solid ${entry.color}50`,
                                  }} />
                              );
                            }
                          });
                        })()}

                        
                        {/* Step-progress-bar sessions */}
                        {user.sessions.map((session, idx) => {
                          const { left, width } = getBarPosition(session.start, session.end, viewDate, zoomLevel);
                          if (left < 0 || width <= 0) return null; // skip sessions outside current view
                          const isLive = !session.end;
                          const dotColor = session.isLate ? '#f59e0b' : isLive ? TIMELINE_CONFIG.COLORS.ACTIVE : TIMELINE_CONFIG.COLORS.COMPLETED;
                          const lineColor = session.isLate ? 'rgba(245,158,11,0.45)' : isLive ? 'rgba(16,185,129,0.45)' : 'rgba(99,102,241,0.45)';

                          return (
                            <div key={idx}
                              className="absolute cursor-pointer"
                              style={{ left: `${left}%`, width: `${Math.max(0.3, width)}%`, top: 0, bottom: 0 }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 8,
                                  userName: user.name,
                                  startTime: session.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                                  endTime: session.end ? session.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null,
                                  duration: session.end ? `${((session.end.getTime() - session.start.getTime()) / 3600000).toFixed(1)} hr` : 'Working...',
                                  branch: session.branch || '-',
                                  isLate: session.isLate,
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}>
                              {/* Connecting line */}
                              <div className="absolute top-1/2 -translate-y-1/2 rounded-full" style={{ left: 5, right: 5, height: 2, background: lineColor }} />
                              {/* Start dot */}
                              <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.05 }}
                                className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)] shadow-sm"
                                style={{ left: 0, width: 10, height: 10, background: dotColor, zIndex: 2 }}
                              />
                              {/* End dot */}
                              {isLive ? (
                                <motion.div
                                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)]"
                                  style={{ right: 0, width: 10, height: 10, background: dotColor, zIndex: 2 }}
                                />
                              ) : (
                                <motion.div
                                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.05 + 0.1 }}
                                  className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)] shadow-sm"
                                  style={{ right: 0, width: 10, height: 10, background: dotColor, zIndex: 2 }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========== FOOTER STATS ========== */}
        <div className="px-3 md:px-5 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-5 text-[10px] md:text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-bold opacity-60">Active: <span className="font-black text-emerald-600">{stats.working}</span>/{stats.total}</span>
            </span>
            {roleFilter !== 'all' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <span className="font-bold opacity-60 uppercase">{roleFilter} filter</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-bold opacity-60">Late: <span className="font-black text-amber-500">{stats.late}</span></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="font-bold opacity-60">Hours: <span className="font-black text-indigo-600">{stats.totalHours}h</span></span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">Real-time Sync</span>
          </div>
        </div>
      </div>

      {/* ========== TOOLTIP ========== */}
      <AnimatePresence>
        {tooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="fixed z-50 bg-slate-800 dark:bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl text-[10px] pointer-events-none border border-white/10"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
            <p className="font-black text-[11px] mb-1.5">{tooltip.userName}</p>
            <div className="space-y-1 opacity-80 text-[10px]">
              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" /> {tooltip.startTime} - {tooltip.endTime || 'Now'}</p>
              <p className="flex items-center gap-1.5"><span className="w-3 text-center">&#9201;</span> {tooltip.duration}</p>
              <p className="flex items-center gap-1.5"><span className="w-3 text-center">&#128205;</span> {tooltip.branch}</p>
              {tooltip.isLate && <p className="text-amber-400 font-bold flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Late arrival</p>}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-slate-800 dark:bg-slate-900 rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:hidden">
        <BottomNav role="admin" />
      </div>

      {/* ========== MODALS ========== */}
      <ShiftTemplateModal
        open={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onChanged={fetchWorkSchedules}
      />
      <AssignShiftModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 5px; width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
