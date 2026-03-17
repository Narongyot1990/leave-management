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
import dayjs from 'dayjs';

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
      const now = new Date();
      const month = dayjs(now).format('YYYY-MM');
      const prevMonth = dayjs(now).subtract(1, 'month').format('YYYY-MM');
      const nextMonth = dayjs(now).add(1, 'month').format('YYYY-MM');

      const fetchMonth = async (m: string) => {
        const res = await fetch(`/api/work-schedule?month=${m}`);
        return res.json();
      };

      const [currData, prevData, nextData] = await Promise.all([
        fetchMonth(month),
        fetchMonth(prevMonth),
        fetchMonth(nextMonth)
      ]);

      const map: typeof workSchedules = {};
      const process = (data: any) => {
        if (data.success && data.schedules) {
          data.schedules.forEach((s: any) => {
            map[s.userId] = [...(map[s.userId] || []), ...s.entries];
          });
        }
      };

      process(currData);
      process(prevData);
      process(nextData);
      setWorkSchedules(map);
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

  const dateRangeLabel = useMemo(() => {
    const end = new Date(refDate);
    end.setDate(end.getDate() + totalDays - 1);
    return `${refDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [refDate, totalDays]);

  const isZoomMin = zoomValue === TIMELINE_CONFIG.ZOOM.MIN;
  const isZoomMax = zoomValue === TIMELINE_CONFIG.ZOOM.MAX;

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
                <span className="text-[7px] font-black uppercase tracking-widest opacity-30 px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border)] hidden sm:inline">v5.1</span>
              </div>
              <p className="text-[8px] font-bold opacity-25 uppercase tracking-widest mt-0.5 hidden sm:block">Premium Management Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
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

            <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors">
              <HistoryIcon className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        {/* ========== FILTER BAR ========== */}
        <div className="px-3 md:px-5 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-inset)]/40 shrink-0">
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['all', 'driver', 'leader'] as const).map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${roleFilter === f
                  ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {f === 'all' ? `All (${timelineData.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowShiftModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all">
              <LayoutGrid className="w-3 h-3" /><span className="hidden sm:inline">Shifts</span>
            </button>
            <button onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all">
              <Calendar className="w-3 h-3" /><span className="hidden sm:inline">Assign</span>
            </button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button onClick={() => setSyncScroll(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${syncScroll
                ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)]'}`}>
              {syncScroll ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* ========== CONTROLS BAR ========== */}
        <div className="px-3 md:px-5 py-2 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' }); }}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToToday} className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Now
            </button>
            <button onClick={() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' }); }}
              className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="text-[11px] md:text-[13px] font-black text-[var(--text-primary)] uppercase tracking-tight">{dateRangeLabel}</span>
          </div>
          <div className="w-20 hidden md:block" />
        </div>

        {/* ========== HISTORY PANEL ========== */}
        <AnimatePresence>
          {isHistoryExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
              <div className="px-3 md:px-5 py-3 bg-[var(--bg-inset)]/50 border-b border-[var(--border)]">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {records.slice(0, 6).map(r => (
                    <div key={r._id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                      <UserAvatar imageUrl={r.userImage} displayName={r.userName} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black truncate">{r.userName}</p>
                        <p className="text-[8px] font-bold opacity-40">{dayjs(r.timestamp).format('HH:mm')} · {r.type.toUpperCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========== GANTT CHART ========== */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header Tier */}
          <div className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="w-[50px] md:w-[180px] shrink-0 border-r border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center md:justify-start md:px-4 py-3 sticky left-0 z-20">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Team</span>
            </div>
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
                  <div key={col.key} className={`absolute top-0 bottom-0 border-l border-[var(--border)]/20 px-2 flex flex-col justify-center ${col.isDayStart ? 'border-l-2 border-[var(--border)]/50' : ''}`} style={{ left: col.left }}>
                    <span className={`text-[9px] font-black uppercase leading-none ${col.isToday ? 'text-[var(--accent)]' : 'text-slate-400'}`}>{col.label}</span>
                  </div>
                ))}
                <div className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none" style={{ left: ((currentTime.getTime() - refDate.getTime()) / 60000) * pxPerMinute }} />
              </div>
            </div>
          </div>

          <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar">
            {filteredTimelineData.map((user) => {
              const isActive = user.sessions.some(s => !s.end);
              return (
                <div key={user.id} className="flex border-b border-[var(--border)]/30 group min-h-[56px] hover:bg-[var(--accent)]/[0.03]">
                  {/* Staff Info */}
                  <div className="w-[50px] md:w-[180px] shrink-0 px-1 md:px-2 py-2 border-r border-[var(--border)]/30 bg-[var(--bg-surface)] sticky left-0 z-10 flex flex-col md:flex-row items-center gap-1 md:gap-2">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-inset)] border border-[var(--border)]">
                        {user.image ? <img src={user.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{user.name.charAt(0)}</div>}
                      </div>
                      {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
                    </div>
                    <div className="min-w-0 flex-1 text-center md:text-left hidden md:block">
                      <p className="text-[11px] font-bold truncate leading-tight">{user.name}</p>
                      <p className="text-[8px] opacity-40 uppercase font-black tracking-widest">{user.role}</p>
                    </div>
                  </div>

                  {/* Track Area */}
                  <div className="flex-1 relative overflow-x-auto custom-scrollbar no-scrollbar-ui"
                    ref={(el) => { if (el) rowScrollRefs.current.set(user.id, el); else rowScrollRefs.current.delete(user.id); }}
                    onScroll={(e) => {
                      if (isSyncingRef.current) return;
                      const sl = e.currentTarget.scrollLeft;
                      if (syncScroll) {
                        isSyncingRef.current = true;
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = sl;
                        rowScrollRefs.current.forEach((rowEl, id) => { if (id !== user.id) rowEl.scrollLeft = sl; });
                        isSyncingRef.current = false;
                      } else if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = sl;
                    }}>
                    <div className="relative h-full min-h-[52px]" style={{ width: totalWidth }}>
                      {/* Grid Lines */}
                      {columnHeaders.map(c => <div key={`g-${c.key}`} className="absolute top-0 bottom-0 border-l border-[var(--tm-grid)] w-px opacity-20" style={{ left: c.left }} />)}

                      {/* Plan Layers (Shifts) - THINNER */}
                      {(workSchedules[user.id] || []).map((entry, idx) => {
                        const start = dayjs(entry.date).hour(entry.startHour).minute(entry.startMinute).toDate();
                        const dur = entry.endHour < entry.startHour ? (24 - entry.startHour + entry.endHour) * 60 : (entry.endHour - entry.startHour) * 60;
                        const left = ((start.getTime() - refDate.getTime()) / 60000) * pxPerMinute;
                        const width = dur * pxPerMinute;
                        if (left + width < 0 || left > totalWidth) return null;
                        return (
                          <div key={`${entry.date}-${idx}`} className="absolute top-1.5 bottom-1.5 pointer-events-none" style={{ left, width }}>
                            <div className="absolute inset-x-0 top-[20%] bottom-[20%] rounded-md opacity-[0.08] backdrop-blur-[1px]" style={{ background: entry.color, border: `1px solid ${entry.color}44` }} />
                            <div className="absolute left-0 top-[35%] bottom-[35%] w-[1.5px] rounded-full opacity-40" style={{ background: entry.color }} />
                            <div className="absolute right-0 top-[35%] bottom-[35%] w-[1.5px] rounded-full opacity-40" style={{ background: entry.color }} />
                          </div>
                        );
                      })}

                      {/* Progress Bars - THICKER */}
                      {user.sessions.map((session, idx) => {
                        const { left, width } = getBarPosition(session.start, session.end, refDate, pxPerMinute, currentTime);
                        if (width <= 0) return null;
                        const isLiveArr = !session.end;
                        const gradientColors = session.isLate ? TIMELINE_CONFIG.COLORS.GRADIENT.AMBER : isLiveArr ? TIMELINE_CONFIG.COLORS.GRADIENT.EMERALD : TIMELINE_CONFIG.COLORS.GRADIENT.INDIGO;
                        const colorMain = gradientColors[0];
                        const gradientStr = `linear-gradient(90deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2]} 100%)`;

                        return (
                          <motion.div key={idx} className="absolute top-1/2 -translate-y-1/2 flex items-center group/session h-9"
                            style={{ left: `${left}px`, width: `${Math.max(20, width)}px` }}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 12, userName: user.name, startTime: dayjs(session.start).format('HH:mm'), endTime: session.end ? dayjs(session.end).format('HH:mm') : null, duration: session.end ? `${((session.end.getTime() - session.start.getTime()) / 3600000).toFixed(1)}h` : 'Live', branch: session.branch, isLate: session.isLate });
                            }} onMouseLeave={() => setTooltip(null)}>
                            <div className="absolute left-[8px] right-[8px] h-2 rounded-full blur-[3px] opacity-20" style={{ background: colorMain }} />
                            <div className="absolute left-[4px] right-[4px] h-[10px] rounded-full z-10 transition-all group-hover/session:h-[12px]" style={{ background: gradientStr }}>
                              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
                            </div>
                            <div className="absolute left-0 w-[18px] h-[18px] rounded-full border-[3px] border-[var(--bg-surface)] z-20 shadow-lg" style={{ background: colorMain }} />
                            {isLiveArr ? (
                              <div className="absolute right-0 flex items-center justify-center z-20">
                                <div className="w-[18px] h-[18px] rounded-full border-[3px] border-[var(--bg-surface)] shadow-lg" style={{ background: colorMain }} />
                                <div className="absolute w-[26px] h-[26px] rounded-full animate-ping opacity-20" style={{ background: colorMain }} />
                              </div>
                            ) : (
                              <div className="absolute right-0 w-[18px] h-[18px] rounded-full border-[3px] border-[var(--bg-surface)] z-20 shadow-lg" style={{ background: gradientColors[2] }} />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========== FOOTER STATS ========== */}
        <div className="px-5 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-bold opacity-60">Working: {stats.working}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="font-bold opacity-60">Late: {stats.late}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /><span className="font-bold opacity-60">Total {stats.totalHours}h</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">v5.1 Premium</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="fixed z-50 bg-slate-800 text-white px-3 py-2 rounded-xl shadow-2xl text-[10px] pointer-events-none border border-white/10"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
            <p className="font-black mb-1">{tooltip.userName}</p>
            <p className="opacity-80">{tooltip.startTime} - {tooltip.endTime || 'Now'} ({tooltip.duration})</p>
            {tooltip.isLate && <p className="text-amber-400 font-bold mt-1">Arrival Late</p>}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:hidden"><BottomNav role="admin" /></div>

      <ShiftTemplateModal open={showShiftModal} onClose={() => setShowShiftModal(false)} onChanged={fetchWorkSchedules} />
      <AssignShiftModal open={showAssignModal} onClose={() => setShowAssignModal(false)} />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .no-scrollbar-ui::-webkit-scrollbar { display: none; }
        .no-scrollbar-ui { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function AttendanceMonitorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[var(--bg-base)]"><div className="w-10 h-10 rounded-full border-[3px] animate-spin border-[var(--border)] border-t-[var(--accent)]" /></div>}>
      <AttendanceMonitorContent />
    </Suspense>
  );
}
