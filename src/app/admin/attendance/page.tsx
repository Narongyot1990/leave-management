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
      let range = 'day';
      if (zoomLevel === 'month') {
        d.setDate(1);
        range = 'month';
      }
      const dateStr = d.toISOString().split('T')[0];
      const res = await fetch(`${TIMELINE_CONFIG.API.ATTENDANCE}?date=${dateStr}&range=${range}`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [viewDate, zoomLevel]);

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
        (data.schedules as any[]).forEach((s: any) => { map[s.userId] = s.entries; });
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
    if (zoomLevel === 'month') d.setMonth(d.getMonth() + delta);
    else if (zoomLevel === 'day') d.setDate(d.getDate() + delta);
    else d.setDate(d.getDate() + delta); // hour view still navigates by day
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

  // ---------- Filtered by Role ----------
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
    if (zoom === 'month') {
      const daysInMonth = new Date(vd.getFullYear(), vd.getMonth() + 1, 0).getDate();
      const startD = start.getDate() - 1 + start.getHours() / 24;
      const effectiveEnd = end || (now.getMonth() === vd.getMonth() ? now : new Date(vd.getFullYear(), vd.getMonth(), daysInMonth, 23, 59));
      const endD = effectiveEnd.getDate() - 1 + effectiveEnd.getHours() / 24;
      return { left: Math.max(0, (startD / daysInMonth) * 100), width: Math.max(0.5, ((endD - startD) / daysInMonth) * 100) };
    } else {
      // day and hour both show 24 columns (hours), hour view just has wider columns
      const startH = start.getHours() + start.getMinutes() / 60;
      const effectiveEnd = end || (vd.toDateString() === now.toDateString() ? now : new Date(vd.getFullYear(), vd.getMonth(), vd.getDate(), 23, 59));
      const endH = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
      return { left: Math.max(0, (startH / 24) * 100), width: Math.max(0.8, ((endH - startH) / 24) * 100) };
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
        return { label: String(i + 1), isWeekend, isToday, key: `d${i}` };
      });
    } else {
      // Day view: 24 columns (0-23h), Hour view: 24 columns but wider
      return Array.from({ length: 24 }, (_, i) => {
        const isWorkHour = i >= TIMELINE_CONFIG.SCHEDULE.EXPECTED_START && i < TIMELINE_CONFIG.SCHEDULE.EXPECTED_END;
        const isNowHour = new Date().getHours() === i && viewDate.toDateString() === new Date().toDateString();
        return { label: `${i.toString().padStart(2, '0')}:00`, isWorkHour, isNowHour, key: `h${i}` };
      });
    }
  }, [zoomLevel, viewDate]);

  // ---------- Date Display ----------
  const dateRangeLabel = useMemo(() => {
    if (zoomLevel === 'month') return viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    return viewDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [zoomLevel, viewDate]);

  const isZoomMin = zoomValue === TIMELINE_CONFIG.ZOOM.MIN;
  const isZoomMax = zoomValue === TIMELINE_CONFIG.ZOOM.MAX;

  // Column sizing: hour view = wider columns for detail
  const colMinWidth = zoomLevel === 'month' ? 32 : zoomLevel === 'hour' ? 60 : 40;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      <div className="lg:pl-[240px] flex-1 flex flex-col min-h-0">

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

        {/* ========== FILTER + SHIFT + SYNC BAR ========== */}
        <div className="px-3 md:px-5 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-inset)]/40 shrink-0">
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['all', 'driver', 'leader'] as const).map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${roleFilter === f
                  ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {f === 'all' ? `All (${timelineData.length})` : f === 'driver' ? `Driver (${timelineData.filter(u => u.role === 'driver').length})` : `Leader (${timelineData.filter(u => u.role === 'leader').length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowShiftModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all">
              <LayoutGrid className="w-3 h-3" /><span className="hidden sm:inline">Templates</span>
            </button>
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
              <Calendar className="w-3 h-3" /><span className="hidden sm:inline">Assign Shift</span>
            </button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button onClick={() => setSyncScroll(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${syncScroll
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)]'}`}>
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
              {zoomLevel === 'month' ? `${columnHeaders.length} Days` : '24 Hours'}
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
            {/* Staff column header */}
            <div className="w-[140px] md:w-[180px] shrink-0 border-r border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 flex items-center px-3 py-2 sticky left-0 z-20">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Staff ({filteredTimelineData.length})</span>
            </div>
            {/* Timeline column headers */}
            <div className="flex-1 overflow-x-auto custom-scrollbar" ref={scrollContainerRef}
              onScroll={(e) => {
                if (isSyncingRef.current) return;
                isSyncingRef.current = true;
                const sl = e.currentTarget.scrollLeft;
                rowScrollRefs.current.forEach(el => { el.scrollLeft = sl; });
                isSyncingRef.current = false;
              }}>
              <div className="flex min-w-max">
                {columnHeaders.map(col => (
                  <div key={col.key}
                    className={`flex items-center justify-center py-2 border-r border-[var(--border)]/20 transition-colors
                      ${'isWeekend' in col && col.isWeekend ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}
                      ${'isToday' in col && col.isToday ? 'bg-[var(--accent)]/8' : ''}
                      ${'isNowHour' in col && col.isNowHour ? 'bg-[var(--accent)]/8' : ''}`}
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
            {loading && filteredTimelineData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center opacity-40">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-widest">Loading...</p>
                </div>
              </div>
            ) : filteredTimelineData.length === 0 ? (
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
                    className={`flex border-b border-[var(--border)]/30 group transition-colors min-h-[48px] cursor-pointer hover:bg-[var(--accent)]/[0.03]
                      ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                    onClick={() => setSelectedUser(isSelected ? null : user.id)}>

                    {/* Staff Info (sticky left) */}
                    <div className="w-[140px] md:w-[180px] shrink-0 px-2 py-1.5 border-r border-[var(--border)]/30 bg-[var(--bg-surface)] sticky left-0 z-10 flex items-center gap-2">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-inset)]">
                          {user.image ? (
                            <img src={user.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg-surface)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-[11px] font-bold truncate text-[var(--text-primary)]">{user.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {hasLate && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                          <span className={`text-[7px] md:text-[8px] font-medium uppercase truncate ${isActive ? 'text-[var(--accent)]' : hasLate ? 'text-amber-500' : 'opacity-30'}`}>
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
                          const sl = e.currentTarget.scrollLeft;
                          if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = sl;
                          rowScrollRefs.current.forEach((el, id) => {
                            if (id !== user.id) el.scrollLeft = sl;
                          });
                          isSyncingRef.current = false;
                        } else {
                          if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}>
                      <div className="relative h-full min-h-[48px]" style={{ minWidth: columnHeaders.length * colMinWidth }}>
                        {/* Assigned shift backgrounds */}
                        {(workSchedules[user.id] || []).map((entry) => {
                          const entryDate = new Date(entry.date);
                          if (zoomLevel === 'month') {
                            const dim = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                            const day = entryDate.getDate();
                            const s = day - 1 + entry.startHour / 24;
                            const eEnd = entry.endHour < entry.startHour ? day + entry.endHour / 24 : day - 1 + entry.endHour / 24;
                            return (
                              <div key={entry.date} className="absolute top-1 bottom-1 pointer-events-none rounded"
                                style={{ left: `${(s / dim) * 100}%`, width: `${Math.max(0.5, ((eEnd - s) / dim) * 100)}%`, background: entry.color + '15', borderLeft: `2px solid ${entry.color}40` }} />
                            );
                          } else {
                            if (entryDate.toDateString() !== viewDate.toDateString()) return null;
                            const dur = entry.endHour < entry.startHour ? 24 - entry.startHour + entry.endHour : entry.endHour - entry.startHour;
                            return (
                              <div key={entry.date} className="absolute top-1 bottom-1 pointer-events-none rounded"
                                style={{ left: `${(entry.startHour / 24) * 100}%`, width: `${Math.max(0.5, (dur / 24) * 100)}%`, background: entry.color + '15', borderLeft: `2px solid ${entry.color}40` }} />
                            );
                          }
                        })}

                        {/* Gradient session bars */}
                        {user.sessions.map((session, idx) => {
                          const { left, width } = getBarPosition(session.start, session.end, viewDate, zoomLevel);
                          if (width <= 0) return null;
                          const isLive = !session.end;
                          const bg = session.isLate
                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                            : isLive
                              ? `linear-gradient(90deg, ${TIMELINE_CONFIG.COLORS.ACTIVE}, ${TIMELINE_CONFIG.COLORS.ACTIVE_LIGHT})`
                              : `linear-gradient(90deg, ${TIMELINE_CONFIG.COLORS.COMPLETED}, ${TIMELINE_CONFIG.COLORS.COMPLETED_LIGHT})`;

                          return (
                            <motion.div key={idx}
                              initial={{ opacity: 0, scaleX: 0 }}
                              animate={{ opacity: 1, scaleX: 1 }}
                              transition={{ delay: idx * 0.04, duration: 0.3 }}
                              className={`absolute top-1/2 -translate-y-1/2 h-[18px] md:h-[22px] rounded-md flex items-center px-1.5 shadow-sm cursor-pointer transition-transform hover:scale-y-110 ${isLive ? 'animate-pulse-subtle' : ''}`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(1.2, width)}%`,
                                background: bg,
                                transformOrigin: 'left center',
                              }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 8,
                                  userName: user.name,
                                  startTime: session.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                                  endTime: session.end ? session.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null,
                                  duration: session.end
                                    ? `${((session.end.getTime() - session.start.getTime()) / 3600000).toFixed(1)} hr`
                                    : 'Working...',
                                  branch: session.branch || '-',
                                  isLate: session.isLate,
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}>
                              {width > 5 && (
                                <>
                                  {isLive && <div className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0 animate-pulse" />}
                                  <span className="text-[7px] font-bold text-white/90 ml-1 whitespace-nowrap drop-shadow-sm">
                                    {session.start.getHours().toString().padStart(2, '0')}:{session.start.getMinutes().toString().padStart(2, '0')}
                                    {session.end && ` - ${session.end.getHours().toString().padStart(2, '0')}:${session.end.getMinutes().toString().padStart(2, '0')}`}
                                  </span>
                                </>
                              )}
                            </motion.div>
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
