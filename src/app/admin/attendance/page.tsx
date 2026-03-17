'use client';
import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
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

function AttendanceMonitorContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(TIMELINE_CONFIG.ZOOM.LEVELS[TIMELINE_CONFIG.ZOOM.DEFAULT]);
  const [zoomValue, setZoomValue] = useState<number>(TIMELINE_CONFIG.ZOOM.DEFAULT);
  
  // Continuous Timeline Range: +/- 15 days from now
  const [refDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [totalDays] = useState(31);
  
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'leader'>('all');
  const [syncScroll, setSyncScroll] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [workSchedules, setWorkSchedules] = useState<Record<string, { date: string; color: string; startHour: number; startMinute: number; endHour: number; endMinute: number }[]>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rowScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSyncingRef = useRef(false);

  // Update time every minute for real-time growing bars
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
      const start = new Date(refDate).toISOString().split('T')[0];
      const end = new Date(refDate);
      end.setDate(end.getDate() + totalDays);
      const endDate = end.toISOString().split('T')[0];
      const res = await fetch(`${TIMELINE_CONFIG.API.ATTENDANCE}?startDate=${start}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [refDate, totalDays]);

  useEffect(() => {
    fetchUsers();
    fetchRecords();
  }, [fetchUsers, fetchRecords]);

  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.ATTENDANCE_EVENT, callback: fetchRecords }], true);
  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.DRIVER_UPDATED_EVENT, callback: fetchUsers }], true);

  const fetchWorkSchedules = useCallback(async () => {
    try {
      // Fetch current and surrounding months to be safe
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/work-schedule?month=${month}`);
      const data = await res.json();
      if (data.success) {
        const map: typeof workSchedules = {};
        (data.schedules as any[]).forEach((s: any) => { map[s.userId] = s.entries; });
        setWorkSchedules(map);
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchWorkSchedules(); }, [fetchWorkSchedules]);

  // ---------- Zoom & Navigation ----------
  const handleZoomChange = useCallback((newValue: number) => {
    const v = Math.max(TIMELINE_CONFIG.ZOOM.MIN, Math.min(TIMELINE_CONFIG.ZOOM.MAX, newValue));
    setZoomValue(v);
    setZoomLevel(TIMELINE_CONFIG.ZOOM.LEVELS[v]);
  }, []);

  const pxPerMinute = (TIMELINE_CONFIG as any).SCALE[zoomLevel.toUpperCase()] || 1.0;
  const totalWidth = totalDays * 24 * 60 * pxPerMinute;

  useEffect(() => {
    // Initial scroll to "Now"
    if (scrollContainerRef.current) {
      const now = new Date();
      const minutesFromRef = (now.getTime() - refDate.getTime()) / 60000;
      const scrollPos = minutesFromRef * pxPerMinute - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollLeft = scrollPos;
    }
  }, [pxPerMinute, refDate]);

  const goToToday = useCallback(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const minutesFromRef = (now.getTime() - refDate.getTime()) / 60000;
      const scrollPos = minutesFromRef * pxPerMinute - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [pxPerMinute, refDate]);

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

  // ---------- Position Calculations (Absolute Pixels) ----------
  const getBarPosition = useCallback((start: Date, end: Date | null, ref: Date, pxMin: number, now: Date) => {
    const left = ((start.getTime() - ref.getTime()) / 60000) * pxMin;
    const finalEnd = end || now;
    const width = ((finalEnd.getTime() - start.getTime()) / 60000) * pxMin;
    
    return { left, width: Math.max(1, width) };
  }, []);

  // ---------- Dynamic Column Markers ----------
  const columnHeaders = useMemo(() => {
    const markers: { label: string; subLabel?: string; left: number; key: string; isDayStart?: boolean; isToday?: boolean }[] = [];
    const intervalMinutes = (zoomLevel === 'month' || zoomLevel === 'week') ? 1440 : 60; // Day markers or Hour markers
    
    for (let i = 0; i < totalDays * 24 * 60; i += intervalMinutes) {
      const d = new Date(refDate.getTime() + i * 60000);
      const isDayStart = d.getHours() === 0;
      const isToday = d.toDateString() === new Date().toDateString();
      
      let label = "";
      if (zoomLevel === 'month' || zoomLevel === 'week') {
        label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      } else {
        label = d.getHours().toString().padStart(2, '0') + ":00";
      }

      markers.push({
        label,
        subLabel: (isDayStart && zoomLevel !== 'month') ? d.toLocaleDateString('th-TH', { weekday: 'short' }) : undefined,
        left: i * pxPerMinute,
        key: `m-${i}`,
        isDayStart,
        isToday
      });
    }
    return markers;
  }, [zoomLevel, pxPerMinute, refDate, totalDays]);

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2);
    return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
  };

  // ---------- Date Display ----------
  // ---------- Display Utils ----------
  const dateRangeLabel = useMemo(() => {
    const end = new Date(refDate);
    end.setDate(end.getDate() + totalDays - 1);
    return `${refDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [refDate, totalDays]);

  const isZoomMin = zoomValue === TIMELINE_CONFIG.ZOOM.MIN;
  const isZoomMax = zoomValue === TIMELINE_CONFIG.ZOOM.MAX;

  // Column sizing: hour view = wider columns for detail
  const colMinWidth = zoomLevel === 'month' ? 32 : zoomLevel === 'week' ? 38 : zoomLevel === 'hour' ? 60 : 40;

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
                  className={`w-7 h-7 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${zoomValue === idx
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
            <button onClick={() => {
              if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
            }}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday}
              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Now
            </button>
            <button onClick={() => {
              if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
            }}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] md:text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{dateRangeLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-bold opacity-40">
            <span className="hidden md:inline uppercase tracking-widest">
              Continuous Timeline
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
          {/* 2-Tier Header & Column Headers */}
          <div className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-md">
            {/* Staff column header */}
            <div className="w-[50px] md:w-[180px] shrink-0 border-r border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center md:justify-start md:px-4 py-3 sticky left-0 z-20">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span className="md:hidden">STF</span>
                <span className="hidden md:inline">Team ({filteredTimelineData.length})</span>
              </span>
            </div>
            {/* Timeline column headers */}
            <div className="flex-1 overflow-x-auto custom-scrollbar no-scrollbar-ui" ref={scrollContainerRef}
              onScroll={(e) => {
                if (isSyncingRef.current) return;
                isSyncingRef.current = true;
                const sl = e.currentTarget.scrollLeft;
                rowScrollRefs.current.forEach(el => { el.scrollLeft = sl; });
                isSyncingRef.current = false;
              }}>
              <div className="relative h-12" style={{ width: totalWidth }}>
                {columnHeaders.map(col => (
                  <div key={col.key}
                    className={`absolute top-0 bottom-0 border-l border-[var(--border)]/20 transition-all px-2 flex flex-col justify-center
                      ${col.isDayStart ? 'border-l-2 border-[var(--border)]/50 bg-slate-500/[0.02]' : ''}
                      ${col.isToday ? 'bg-[var(--accent)]/[0.03]' : ''}`}
                    style={{ left: col.left }}>
                    <span className={`text-[9px] font-black uppercase tracking-tighter leading-none whitespace-nowrap
                      ${col.isToday ? 'text-[var(--accent)] font-black' : col.isDayStart ? 'text-slate-500' : 'text-slate-400'}`}>
                      {col.label}
                    </span>
                    {col.subLabel && (
                      <span className="text-[7.5px] font-black opacity-30 uppercase mt-1 tracking-widest">{col.subLabel}</span>
                    )}
                  </div>
                ))}
                
                {/* Now Indicator Header Marker */}
                <div className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
                  style={{ left: ((currentTime.getTime() - refDate.getTime()) / 60000) * pxPerMinute }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
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
                className={`flex border-b border-[var(--border)]/30 group transition-colors min-h-[56px] cursor-pointer hover:bg-[var(--accent)]/[0.03]
                  ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                onClick={() => setSelectedUser(isSelected ? null : user.id)}>

                {/* Staff Info (sticky left) */}
                <div className="w-[50px] md:w-[180px] shrink-0 px-1 md:px-2 py-2 border-r border-[var(--border)]/30 bg-[var(--bg-surface)] sticky left-0 z-10 flex flex-col md:flex-row items-center gap-1 md:gap-2 shadow-[2px_0_8px_rgba(0,0,0,0.02)] dark:shadow-[2px_0_12px_rgba(0,0,0,0.2)]">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden bg-[var(--bg-inset)] border border-[var(--border)] shadow-sm">
                          {user.image ? (
                            <img src={user.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-[1.5px] border-[var(--bg-surface)] shadow-sm" />}
                      </div>
                      
                      <div className="min-w-0 flex-1 text-center md:text-left">
                        {/* Mobile Initials */}
                        <p className="text-[9px] font-black text-[var(--accent)] md:hidden tracking-tighter uppercase">{getInitials(user.name)}</p>
                        
                        {/* Desktop Full Name */}
                        <p className="text-[11px] font-bold truncate text-[var(--text-primary)] hidden md:block">{user.name}</p>
                        
                        <div className="hidden md:flex items-center gap-1 mt-0.5">
                          {hasLate && <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                          <span className={`text-[8px] font-medium uppercase truncate ${isActive ? 'text-[var(--accent)]' : noActivity ? 'Absent' : hasLate ? 'Late' : 'Off duty'}`}>
                            {isActive ? 'Active' : noActivity ? 'Absent' : hasLate ? 'Late' : 'Off duty'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Track */}
                    <div className="flex-1 relative overflow-x-auto custom-scrollbar no-scrollbar-ui"
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
                      <div className="relative h-full min-h-[48px]" style={{ width: totalWidth }}>
                        {/* Dynamic Grid Lines */}
                        {columnHeaders.filter(c => c.isDayStart || (zoomLevel !== 'month' && !c.isDayStart)).map(c => (
                          <div key={`grid-${c.key}`} className={`absolute top-0 bottom-0 border-l ${c.isDayStart ? 'border-[var(--border)]/40 w-[1.5px]' : 'border-[var(--tm-grid)] w-px'}`}
                            style={{ left: c.left }} />
                        ))}
                        
                        {/* Assigned shift backgrounds (Bracketed Style) */}
                        {(workSchedules[user.id] || []).map((entry) => {
                          const entryDate = new Date(entry.date);
                          const start = new Date(entryDate);
                          start.setHours(entry.startHour, entry.startMinute, 0, 0);
                          const dur = entry.endHour < entry.startHour ? (24 - entry.startHour + entry.endHour) * 60 : (entry.endHour - entry.startHour) * 60;
                          
                          if (start < refDate) return null;

                          const left = ((start.getTime() - refDate.getTime()) / 60000) * pxPerMinute;
                          const width = dur * pxPerMinute;
                          return (
                            <div key={entry.date} className="absolute top-1 bottom-1 pointer-events-none group/shift"
                              style={{ left: `${left}px`, width: `${Math.max(4, width)}px` }}>
                              {/* Glassmorphism background */}
                              <div className="absolute inset-0 rounded-md opacity-[0.06] dark:opacity-[0.15] backdrop-blur-[2px] transition-opacity group-hover/shift:opacity-[0.2]" 
                                style={{ background: entry.color, border: `1px solid ${entry.color}44` }} />
                              {/* Left & Right Accents (Glass Pill effect) */}
                              <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full shadow-sm opacity-60" style={{ background: entry.color }} />
                              <div className="absolute right-0 top-1 bottom-1 w-[3px] rounded-full shadow-sm opacity-60" style={{ background: entry.color }} />
                            </div>
                          );
                        })}
                        {/* High-Fidelity Step Progress bars */}
                        {user.sessions.map((session, idx) => {
                          const { left, width } = getBarPosition(session.start, session.end, refDate, pxPerMinute, currentTime);
                          if (width <= 0) return null;
                          const isLive = !session.end;
                          
                          // Gradient Selection
                          const gradientColors = session.isLate 
                            ? TIMELINE_CONFIG.COLORS.GRADIENT.AMBER 
                            : isLive 
                              ? TIMELINE_CONFIG.COLORS.GRADIENT.EMERALD 
                              : TIMELINE_CONFIG.COLORS.GRADIENT.INDIGO;
                          
                          const colorMain = gradientColors[0];
                          const gradientStr = `linear-gradient(90deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`;

                          return (
                            <motion.div key={idx}
                              initial={{ opacity: 0, scaleY: 0.8 }}
                              animate={{ opacity: 1, scaleY: 1 }}
                              transition={{ duration: 0.4, delay: idx * 0.03 }}
                              className="absolute top-1/2 -translate-y-1/2 flex items-center group/session h-7"
                              style={{ left: `${left}px`, width: `${Math.max(16, width)}px` }}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltip({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top - 12,
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
                              
                              {/* The track (Subtle glow) */}
                              <div className="absolute left-[6px] right-[6px] h-1.5 rounded-full blur-[2px] opacity-20 pointer-events-none" 
                                style={{ background: colorMain }} />
                              
                              {/* The Main Gradient Bar (Capsule) */}
                              <div className="absolute left-[3px] right-[3px] h-[7px] rounded-full z-10 transition-all group-hover/session:h-[9px] group-hover/session:shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                                style={{ background: gradientStr, boxShadow: isLive ? `0 0 10px ${colorMain}44` : 'none' }}>
                                {/* Shiny Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full pointer-events-none" />
                              </div>

                              {/* Start Node (Pill End) */}
                              <div className="absolute left-0 w-[14px] h-[14px] rounded-full border-[2.5px] border-[var(--bg-surface)] z-20 shadow-lg"
                                style={{ background: colorMain }} />

                              {/* End Node or Pulse Indicator */}
                              {isLive ? (
                                <div className="absolute right-0 flex items-center justify-center z-20">
                                  <div className="w-[14px] h-[14px] rounded-full border-[2.5px] border-[var(--bg-surface)] shadow-lg" 
                                    style={{ background: colorMain }} />
                                  <div className="absolute w-[22px] h-[22px] rounded-full animate-ping opacity-20" 
                                    style={{ background: colorMain }} />
                                </div>
                              ) : (
                                <div className="absolute right-0 w-[14px] h-[14px] rounded-full border-[2.5px] border-[var(--bg-surface)] z-20 shadow-lg"
                                  style={{ background: gradientColors[2] }} />
                              )}

                              {/* Time Label (Visible on hover or if wide enough) */}
                              {width > 40 && (
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/session:opacity-100 transition-all bg-[var(--bg-surface)] px-2 py-1 rounded-lg border border-[var(--border)] shadow-xl pointer-events-none z-30">
                                  <span className="text-[8px] font-black whitespace-nowrap text-[var(--accent)] tracking-tighter">
                                    {session.start.getHours()}:{session.start.getMinutes().toString().padStart(2, '0')}
                                    {session.end && ` - ${session.end.getHours()}:${session.end.getMinutes().toString().padStart(2, '0')}`}
                                  </span>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}


                        {/* "Now" Indicator (Vertical Line) */}
                        <div className="absolute top-0 bottom-0 w-px bg-red-500/30 z-20 pointer-events-none"
                          style={{ left: ((currentTime.getTime() - refDate.getTime()) / 60000) * pxPerMinute }} />
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
        .no-scrollbar-ui::-webkit-scrollbar { display: none; }
        .no-scrollbar-ui { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
        .animate-pulse-subtle { animation: pulse-subtle 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function AttendanceMonitorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    }>
      <AttendanceMonitorContent />
    </Suspense>
  );
}
