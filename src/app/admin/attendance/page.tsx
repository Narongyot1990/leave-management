'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Users, ChevronLeft, ChevronRight, History as HistoryIcon,
  ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CalendarDays,
  Link, Unlink, LayoutGrid, Calendar,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';
import BottomNav from '@/components/BottomNav';
import { TIMELINE_CONFIG, type ZoomLevel } from '@/lib/timeline-config';
import ShiftTemplateModal from '@/components/ShiftTemplateModal';
import AssignShiftModal from '@/components/AssignShiftModal';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
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

interface Session {
  start: Date;
  end: Date | null;
  branch: string;
  isLate: boolean;
}

interface TimelineUser {
  id: string;
  name: string;
  image?: string;
  branch?: string;
  role?: string;
  sessions: Session[];
}

interface TooltipData {
  x: number; y: number;
  userName: string;
  startTime: string;
  endTime: string | null;
  duration: string;
  branch: string;
  isLate: boolean;
}

interface ColHeader {
  key: string;
  label: string;
  isWeekend: boolean;
  isToday: boolean;
  highlight: boolean;      // current-hour / now-period highlight
  workHour: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fmtTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function AttendanceMonitorPage() {
  /* ---- state ---- */
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const [zoomValue, setZoomValue] = useState<number>(TIMELINE_CONFIG.ZOOM.DEFAULT);
  const zoomLevel = TIMELINE_CONFIG.ZOOM.LEVELS[zoomValue] as ZoomLevel;
  const [viewDate, setViewDate] = useState(new Date());

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'leader'>('all');
  const [syncScroll, setSyncScroll] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [workSchedules, setWorkSchedules] = useState<Record<string, { date: string; color: string; startHour: number; startMinute: number; endHour: number; endMinute: number }[]>>({});

  /* ---- refs ---- */
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const syncing = useRef(false);

  /* ---- data fetching ---- */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(TIMELINE_CONFIG.API.USERS);
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (e) { console.error(e); }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const d = new Date(viewDate);
      d.setDate(1);
      const dateStr = d.toISOString().split('T')[0];
      const res = await fetch(`${TIMELINE_CONFIG.API.ATTENDANCE}?date=${dateStr}&range=month`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate]);

  const fetchWorkSchedules = useCallback(async () => {
    try {
      const month = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/work-schedule?month=${month}`);
      const data = await res.json();
      if (data.success) {
        const m: typeof workSchedules = {};
        (data.schedules as any[]).forEach(s => { m[s.userId] = s.entries; });
        setWorkSchedules(m);
      }
    } catch (e) { console.error(e); }
  }, [viewDate]);

  useEffect(() => { fetchUsers(); fetchRecords(); fetchWorkSchedules(); }, [fetchUsers, fetchRecords, fetchWorkSchedules]);

  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.ATTENDANCE_EVENT, callback: fetchRecords }], true);
  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.DRIVER_UPDATED_EVENT, callback: fetchUsers }], true);

  /* ---- zoom / nav ---- */
  const handleZoom = (v: number) => setZoomValue(Math.max(0, Math.min(2, v)));

  const navigate = (dir: 'prev' | 'next') => {
    const d = new Date(viewDate);
    const delta = dir === 'next' ? 1 : -1;
    if (zoomLevel === 'month') d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta);
    setViewDate(d);
  };

  /* ---- scroll sync ---- */
  const propagateScroll = (scrollLeft: number, sourceId?: string) => {
    if (syncing.current) return;
    syncing.current = true;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;
    rowRefs.current.forEach((el, id) => { if (id !== sourceId) el.scrollLeft = scrollLeft; });
    syncing.current = false;
  };

  /* ---- build timeline data ---- */
  const timelineData = useMemo<TimelineUser[]>(() => {
    const map = new Map<string, TimelineUser>();
    users.forEach(u => map.set(u._id, {
      id: u._id, name: u.name || u.lineDisplayName || 'Unknown',
      image: u.lineProfileImage, branch: u.branch, role: u.role, sessions: [],
    }));
    const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sorted.forEach(r => {
      if (!map.has(r.userId)) map.set(r.userId, { id: r.userId, name: r.userName, image: r.userImage, sessions: [] });
      const u = map.get(r.userId)!;
      if (r.type === 'in') {
        const st = new Date(r.timestamp);
        const exp = new Date(st); exp.setHours(TIMELINE_CONFIG.SCHEDULE.EXPECTED_START, TIMELINE_CONFIG.SCHEDULE.LATE_THRESHOLD_MINUTES, 0, 0);
        u.sessions.push({ start: st, end: null, branch: r.branch, isLate: st > exp });
      } else {
        const last = u.sessions[u.sessions.length - 1];
        if (last && !last.end) last.end = new Date(r.timestamp);
      }
    });
    return Array.from(map.values());
  }, [users, records]);

  const filtered = useMemo(() => roleFilter === 'all' ? timelineData : timelineData.filter(u => u.role === roleFilter), [timelineData, roleFilter]);

  const stats = useMemo(() => {
    const working = filtered.filter(u => u.sessions.some(s => !s.end)).length;
    const late = filtered.filter(u => u.sessions.some(s => s.isLate)).length;
    const hrs = filtered.reduce((a, u) => a + u.sessions.reduce((b, s) => b + (s.start && s.end ? (s.end.getTime() - s.start.getTime()) / 36e5 : 0), 0), 0);
    return { working, total: filtered.length, late, hrs: hrs.toFixed(1) };
  }, [filtered]);

  /* ---- column headers ---- */
  const columns = useMemo<ColHeader[]>(() => {
    const now = new Date();
    if (zoomLevel === 'month') {
      const dim = daysInMonth(viewDate);
      return Array.from({ length: dim }, (_, i) => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1);
        return { key: `d${i}`, label: String(i + 1), isWeekend: d.getDay() === 0 || d.getDay() === 6, isToday: sameDay(d, now), highlight: false, workHour: false };
      });
    }
    if (zoomLevel === 'day') {
      const isToday = sameDay(viewDate, now);
      return [
        { key: 'am', label: 'AM  00 – 12', isWeekend: false, isToday, highlight: isToday && now.getHours() < 12, workHour: true },
        { key: 'pm', label: 'PM  12 – 24', isWeekend: false, isToday, highlight: isToday && now.getHours() >= 12, workHour: true },
      ];
    }
    // hour
    const isToday = sameDay(viewDate, now);
    return Array.from({ length: 24 }, (_, h) => ({
      key: `h${h}`, label: String(h).padStart(2, '0'), isWeekend: false, isToday,
      highlight: isToday && now.getHours() === h,
      workHour: h >= TIMELINE_CONFIG.SCHEDULE.EXPECTED_START && h < TIMELINE_CONFIG.SCHEDULE.EXPECTED_END,
    }));
  }, [zoomLevel, viewDate]);

  /* ---- column width ---- */
  const colW = zoomLevel === 'month' ? 34 : zoomLevel === 'day' ? 200 : 44;
  const trackW = columns.length * colW;

  /* ---- date label ---- */
  const label = useMemo(() => {
    if (zoomLevel === 'month') return viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    return viewDate.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }, [zoomLevel, viewDate]);

  /* ---- bar position (returns % of track width) ---- */
  const barPos = useCallback((s: Session): { left: number; width: number } | null => {
    const now = new Date();
    if (zoomLevel === 'month') {
      if (s.start.getMonth() !== viewDate.getMonth() || s.start.getFullYear() !== viewDate.getFullYear()) return null;
      const dim = daysInMonth(viewDate);
      const sd = s.start.getDate() - 1 + s.start.getHours() / 24 + s.start.getMinutes() / 1440;
      const ed = s.end
        ? s.end.getDate() - 1 + s.end.getHours() / 24 + s.end.getMinutes() / 1440
        : (sameDay(now, viewDate) || now.getMonth() === viewDate.getMonth() ? now.getDate() - 1 + now.getHours() / 24 + now.getMinutes() / 1440 : dim);
      const left = (sd / dim) * 100;
      const width = Math.max(0.3, ((ed - sd) / dim) * 100);
      return { left: Math.max(0, left), width };
    }
    // day & hour: must be same day
    if (!sameDay(s.start, viewDate)) return null;
    const sh = s.start.getHours() + s.start.getMinutes() / 60;
    const eh = s.end ? s.end.getHours() + s.end.getMinutes() / 60 : now.getHours() + now.getMinutes() / 60;
    return { left: Math.max(0, (sh / 24) * 100), width: Math.max(0.5, ((eh - sh) / 24) * 100) };
  }, [zoomLevel, viewDate]);

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      <div className="lg:pl-[240px] flex-1 flex flex-col min-h-0">

        {/* ===== HEADER ===== */}
        <header className="px-3 md:px-5 py-2.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center"><Clock className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[14px] md:text-[16px] font-black tracking-tighter leading-none">TIMELINE MONITOR</h1>
              <p className="text-[8px] font-bold opacity-25 uppercase tracking-widest mt-0.5 hidden sm:block">Real-time Attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* zoom */}
            <div className="flex items-center bg-[var(--bg-inset)] rounded-xl p-0.5 border border-[var(--border)]">
              <button onClick={() => handleZoom(zoomValue - 1)} disabled={zoomValue === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] disabled:opacity-20"><ZoomOut className="w-3.5 h-3.5" /></button>
              {TIMELINE_CONFIG.ZOOM.LABELS.map((lbl, i) => (
                <button key={lbl} onClick={() => handleZoom(i)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${zoomValue === i ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{lbl}</button>
              ))}
              <button onClick={() => handleZoom(zoomValue + 1)} disabled={zoomValue === 2} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] disabled:opacity-20"><ZoomIn className="w-3.5 h-3.5" /></button>
            </div>
            <div className="w-px h-6 bg-[var(--border)] hidden md:block" />
            {/* live stats */}
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 block leading-none">Active</span>
                <span className="text-sm font-black leading-none">{stats.working}<span className="text-[10px] opacity-40">/{stats.total}</span></span>
              </div>
              {stats.late > 0 && <div className="text-right"><span className="text-[8px] font-black uppercase tracking-widest text-amber-500 block leading-none">Late</span><span className="text-sm font-black text-amber-500 leading-none">{stats.late}</span></div>}
            </div>
            <button onClick={() => setIsHistoryExpanded(v => !v)} className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" title="Activity Log">
              <HistoryIcon className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        {/* ===== TOOLBAR ===== */}
        <div className="px-3 md:px-5 py-1.5 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-inset)]/40 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['all', 'driver', 'leader'] as const).map(f => (
              <button key={f} onClick={() => setRoleFilter(f)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${roleFilter === f ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {f === 'all' ? `All (${timelineData.length})` : f === 'driver' ? `Drivers` : `Leaders`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowShiftModal(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all"><LayoutGrid className="w-3 h-3" /><span className="hidden sm:inline">Templates</span></button>
            <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"><Calendar className="w-3 h-3" /><span className="hidden sm:inline">Assign Shift</span></button>
            <div className="w-px h-4 bg-[var(--border)]" />
            <button onClick={() => setSyncScroll(v => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${syncScroll ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)]'}`}>
              {syncScroll ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}{syncScroll ? 'Synced' : 'Free'}
            </button>
          </div>
        </div>

        {/* ===== NAV BAR ===== */}
        <div className="px-3 md:px-5 py-2 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('prev')} className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setViewDate(new Date())} className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors flex items-center gap-1"><RotateCcw className="w-3 h-3" />Today</button>
            <button onClick={() => navigate('next')} className="w-7 h-7 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" /><span className="text-[11px] md:text-[13px] font-black">{label}</span></div>
          <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest hidden md:inline">{columns.length} cols</span>
        </div>

        {/* ===== HISTORY ===== */}
        <AnimatePresence>
          {isHistoryExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0">
              <div className="px-3 md:px-5 py-3 bg-[var(--bg-inset)]/50 border-b border-[var(--border)]">
                <h3 className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Recent Activity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {records.slice(0, 12).map(r => (
                    <div key={r._id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                      <UserAvatar imageUrl={r.userImage} displayName={r.userName} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black truncate">{r.userName}</p>
                        <p className="text-[8px] font-bold opacity-40">{fmtTime(new Date(r.timestamp))} · {r.type.toUpperCase()}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                  ))}
                  {records.length === 0 && <p className="text-[10px] opacity-30 italic col-span-full py-4 text-center">No records</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== GANTT ===== */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* col headers */}
          <div className="flex shrink-0 border-b border-[var(--border)] bg-[var(--bg-surface)]">
            <div className="w-[140px] md:w-[180px] shrink-0 border-r border-[var(--border)] bg-slate-50 dark:bg-slate-900/50 flex items-center px-3 py-2 sticky left-0 z-20">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Staff ({filtered.length})</span>
            </div>
            <div className="flex-1 overflow-x-auto custom-scrollbar" ref={headerScrollRef}
              onScroll={e => propagateScroll(e.currentTarget.scrollLeft)}>
              <div className="flex" style={{ minWidth: trackW }}>
                {columns.map(c => (
                  <div key={c.key} className={`flex items-center justify-center py-2 border-r border-[var(--border)]/20 transition-colors
                    ${c.isWeekend ? 'bg-rose-50/50 dark:bg-rose-950/15' : ''} ${c.highlight ? 'bg-[var(--accent)]/10' : ''} ${c.workHour ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}
                    style={{ width: colW, minWidth: colW }}>
                    <span className={`text-[8px] md:text-[9px] font-black ${c.isWeekend ? 'text-rose-500' : c.highlight ? 'text-[var(--accent)]' : c.isToday ? 'text-[var(--accent)]' : 'text-slate-400'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* rows */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && timelineData.length === 0 ? (
              <div className="flex items-center justify-center h-full"><div className="text-center opacity-40"><div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin mx-auto mb-3" /><p className="text-[11px] font-bold uppercase tracking-widest">Loading...</p></div></div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full"><div className="text-center opacity-40 p-10"><Users className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="text-[12px] font-black uppercase tracking-widest">No Staff Found</p></div></div>
            ) : filtered.map(user => {
              const isActive = user.sessions.some(s => !s.end);
              const hasLate = user.sessions.some(s => s.isLate);
              const noAct = user.sessions.length === 0;

              return (
                <div key={user.id} className={`flex border-b border-[var(--border)]/20 min-h-[52px] hover:bg-[var(--bg-inset)]/30 transition-colors ${selectedUser === user.id ? 'bg-[var(--accent)]/5' : ''}`}
                  onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}>

                  {/* staff info */}
                  <div className="w-[140px] md:w-[180px] shrink-0 px-2 py-1.5 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 flex items-center gap-2 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-lg overflow-hidden ${isActive ? 'ring-2 ring-emerald-500/40' : ''}`}>
                        {user.image
                          ? <img src={user.image} className="w-full h-full object-cover" alt="" />
                          : <div className={`w-full h-full flex items-center justify-center text-[11px] font-black ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{user.name.charAt(0)}</div>}
                      </div>
                      {isActive && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-surface)] animate-pulse" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] md:text-[11px] font-black truncate">{user.name}</p>
                      <span className={`text-[7px] md:text-[8px] font-bold uppercase ${isActive ? 'text-emerald-500' : hasLate ? 'text-amber-500' : 'opacity-30'}`}>
                        {isActive ? 'Active' : noAct ? 'Absent' : hasLate ? 'Late' : 'Off duty'}
                      </span>
                    </div>
                  </div>

                  {/* timeline track */}
                  <div className="flex-1 relative overflow-x-auto custom-scrollbar"
                    ref={el => { if (el) rowRefs.current.set(user.id, el); else rowRefs.current.delete(user.id); }}
                    onScroll={e => { if (syncScroll) propagateScroll(e.currentTarget.scrollLeft, user.id); }}>
                    <div className="relative h-full min-h-[52px]" style={{ minWidth: trackW }}>

                      {/* shift backgrounds */}
                      {(workSchedules[user.id] || []).map(entry => {
                        const ed = new Date(entry.date);
                        if (zoomLevel === 'month') {
                          const dim = daysInMonth(viewDate);
                          const day = ed.getDate();
                          const s = day - 1 + entry.startHour / 24;
                          const eEnd = entry.endHour < entry.startHour ? day + entry.endHour / 24 : day - 1 + entry.endHour / 24;
                          return <div key={entry.date} className="absolute top-0 bottom-0 pointer-events-none rounded-sm" style={{ left: `${(s / dim) * 100}%`, width: `${Math.max(0.5, ((eEnd - s) / dim) * 100)}%`, background: entry.color + '22', borderLeft: `2px solid ${entry.color}60` }} />;
                        }
                        if (!sameDay(ed, viewDate)) return null;
                        const dur = entry.endHour < entry.startHour ? 24 - entry.startHour + entry.endHour : entry.endHour - entry.startHour;
                        return <div key={entry.date} className="absolute top-0 bottom-0 pointer-events-none rounded-sm" style={{ left: `${(entry.startHour / 24) * 100}%`, width: `${Math.max(0.5, (dur / 24) * 100)}%`, background: entry.color + '20', borderLeft: `2px solid ${entry.color}50` }} />;
                      })}

                      {/* session bars (step-progress style) */}
                      {user.sessions.map((session, idx) => {
                        const pos = barPos(session);
                        if (!pos) return null;
                        const isLive = !session.end;
                        const color = session.isLate ? '#f59e0b' : isLive ? TIMELINE_CONFIG.COLORS.ACTIVE : TIMELINE_CONFIG.COLORS.COMPLETED;
                        const lineC = session.isLate ? 'rgba(245,158,11,0.45)' : isLive ? 'rgba(16,185,129,0.45)' : 'rgba(99,102,241,0.45)';
                        return (
                          <div key={idx} className="absolute cursor-pointer" style={{ left: `${pos.left}%`, width: `${Math.max(0.4, pos.width)}%`, top: 0, bottom: 0 }}
                            onMouseEnter={e => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setTooltip({ x: r.left + r.width / 2, y: r.top - 8, userName: user.name, startTime: fmtTime(session.start), endTime: session.end ? fmtTime(session.end) : null, duration: session.end ? `${((session.end.getTime() - session.start.getTime()) / 36e5).toFixed(1)} hr` : 'Working...', branch: session.branch || '-', isLate: session.isLate });
                            }} onMouseLeave={() => setTooltip(null)}>
                            <div className="absolute top-1/2 -translate-y-1/2 rounded-full" style={{ left: 5, right: 5, height: 2, background: lineC }} />
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.04 }} className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)] shadow-sm" style={{ left: 0, width: 10, height: 10, background: color, zIndex: 2 }} />
                            {isLive
                              ? <motion.div animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)]" style={{ right: 0, width: 10, height: 10, background: color, zIndex: 2 }} />
                              : <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.04 + 0.08 }} className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)] shadow-sm" style={{ right: 0, width: 10, height: 10, background: color, zIndex: 2 }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="px-3 md:px-5 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-5 text-[10px] md:text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-bold opacity-60">Active: <span className="font-black text-emerald-600">{stats.working}</span>/{stats.total}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="font-bold opacity-60">Late: <span className="font-black text-amber-500">{stats.late}</span></span></span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /><span className="font-bold opacity-60">Hours: <span className="font-black text-indigo-600">{stats.hrs}h</span></span></span>
          </div>
          <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">Real-time Sync</span></div>
        </div>
      </div>

      {/* ===== TOOLTIP ===== */}
      <AnimatePresence>
        {tooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="fixed z-50 bg-slate-800 dark:bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl text-[10px] pointer-events-none border border-white/10"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
            <p className="font-black text-[11px] mb-1.5">{tooltip.userName}</p>
            <div className="space-y-1 opacity-80">
              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" />{tooltip.startTime} – {tooltip.endTime || 'Now'}</p>
              <p className="flex items-center gap-1.5"><span className="w-3 text-center">⏱</span>{tooltip.duration}</p>
              <p className="flex items-center gap-1.5"><span className="w-3 text-center">📍</span>{tooltip.branch}</p>
              {tooltip.isLate && <p className="text-amber-400 font-bold flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Late arrival</p>}
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-slate-800 dark:bg-slate-900 rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:hidden"><BottomNav role="admin" /></div>

      {/* modals */}
      <ShiftTemplateModal open={showShiftModal} onClose={() => setShowShiftModal(false)} onChanged={fetchWorkSchedules} />
      <AssignShiftModal open={showAssignModal} onClose={() => setShowAssignModal(false)} />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar{height:5px;width:5px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:var(--text-muted)}
      `}</style>
    </div>
  );
}
