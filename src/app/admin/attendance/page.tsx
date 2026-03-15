'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, TrendingUp, Activity, ChevronRight, History as HistoryIcon, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';
import BottomNav from '@/components/BottomNav';
import { TIMELINE_CONFIG, ZoomLevel } from '@/lib/timeline-config';

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
}

export default function AttendanceMonitorPage() {
  const { branches } = useBranches();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // Zoom level from config: 0 = Month, 1 = Day, 2 = Time
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(TIMELINE_CONFIG.ZOOM.LEVELS[TIMELINE_CONFIG.ZOOM.DEFAULT]);
  const [zoomValue, setZoomValue] = useState(TIMELINE_CONFIG.ZOOM.DEFAULT);
  const [viewDate, setViewDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  const fetchLeaders = useCallback(async () => {
    try {
      const res = await fetch(TIMELINE_CONFIG.API.USERS);
      const data = await res.json();
      if (data.success) {
        setLeaders(data.users || []);
      }
    } catch (err) {
      console.error('Fetch Leaders Error:', err);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const start = new Date(viewDate);
      
      // Determine range based on zoom level
      let range = 'day';
      if (zoomLevel === 'month') {
        start.setDate(1);
        range = 'month';
      }
      
      const dateStr = start.toISOString().split('T')[0];
      const res = await fetch(`${TIMELINE_CONFIG.API.ATTENDANCE}?date=${dateStr}&range=${range}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [viewDate, zoomLevel]);

  useEffect(() => {
    fetchLeaders();
    fetchRecords();
  }, [fetchLeaders, fetchRecords]);

  // Pusher handles
  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.ATTENDANCE_EVENT, callback: fetchRecords }], true);
  usePusher(TIMELINE_CONFIG.PUSHER.USERS_CHANNEL, [{ event: TIMELINE_CONFIG.PUSHER.DRIVER_UPDATED_EVENT, callback: fetchLeaders }], true);

  // Handle zoom level changes
  const handleZoomChange = useCallback((newValue: number) => {
    const clampedValue = Math.max(TIMELINE_CONFIG.ZOOM.MIN, Math.min(TIMELINE_CONFIG.ZOOM.MAX, newValue));
    setZoomValue(clampedValue);
    setZoomLevel(TIMELINE_CONFIG.ZOOM.LEVELS[clampedValue]);
  }, []);

  // Handle date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const d = new Date(viewDate);
    if (zoomLevel === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (zoomLevel === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      d.setHours(d.getHours() + (direction === 'next' ? 1 : -1));
    }
    setViewDate(d);
  }, [viewDate, zoomLevel]);

  // Go to today
  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  // Process data for Timeline
  const timelineData = useMemo(() => {
    const userMap = new Map<string, { name: string; image?: string; groups: { start: Date; end: Date | null; branch: string }[] }>();
    
    leaders.forEach(leader => {
      userMap.set(leader._id, { 
        name: leader.name || leader.lineDisplayName, 
        image: leader.lineProfileImage, 
        groups: [] 
      });
    });

    const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sorted.forEach(rec => {
      if (!userMap.has(rec.userId)) {
        userMap.set(rec.userId, { name: rec.userName, image: rec.userImage, groups: [] });
      }
      const userData = userMap.get(rec.userId)!;
      if (rec.type === 'in') {
        userData.groups.push({ start: new Date(rec.timestamp), end: null, branch: rec.branch });
      } else {
        const lastGroup = userData.groups[userData.groups.length - 1];
        if (lastGroup && !lastGroup.end) {
          lastGroup.end = new Date(rec.timestamp);
        }
      }
    });

    return Array.from(userMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [leaders, records]);

  const stats = useMemo(() => {
    const activeNow = timelineData.filter(u => u.groups.some(g => !g.end)).length;
    const totalHours = timelineData.reduce((acc, u) => {
      return acc + u.groups.reduce((gAcc, g) => {
        if (g.start && g.end) {
          return gAcc + (g.end.getTime() - g.start.getTime()) / (1000 * 60 * 60);
        }
        return gAcc;
      }, 0);
    }, 0);
    return { 
      working: activeNow, 
      total: leaders.length,
      totalHours: totalHours.toFixed(1)
    };
  }, [timelineData, leaders]);

  // Calculate timeline position based on zoom level
  const getTimelinePosition = (start: Date, end: Date | null, viewDate: Date, zoom: ZoomLevel) => {
    const now = new Date();
    let left = 0;
    let width = 0;

    if (zoom === 'month') {
      const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
      const startD = start.getDate() - 1 + start.getHours() / 24;
      const effectiveEnd = end || new Date(viewDate.getFullYear(), viewDate.getMonth(), daysInMonth, 23, 59);
      const endD = effectiveEnd.getDate() - 1 + effectiveEnd.getHours() / 24;
      left = (startD / daysInMonth) * 100;
      width = ((endD - startD) / daysInMonth) * 100;
    } else if (zoom === 'day') {
      const startH = start.getHours() + start.getMinutes() / 60;
      const effectiveEnd = end || (viewDate.toDateString() === now.toDateString() ? now : new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate(), 23, 59));
      const endH = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
      left = (startH / 24) * 100;
      width = ((endH - startH) / 24) * 100;
    } else {
      const startM = start.getMinutes();
      const effectiveEnd = end || now;
      const endM = effectiveEnd.getMinutes() + (effectiveEnd.getHours() - start.getHours()) * 60;
      left = (startM / 60) * 100;
      width = Math.max(((endM - startM) / 60) * 100, 5);
    }

    return { left: Math.max(0, left), width: Math.max(1, width) };
  };

  // Get date range for current view
  const getDateRange = () => {
    if (zoomLevel === 'month') {
      return viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    } else if (zoomLevel === 'day') {
      return viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } else {
      return viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + 
        viewDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Get column headers based on zoom level
  const getColumnHeaders = () => {
    if (zoomLevel === 'month') {
      return Array.from({ length: TIMELINE_CONFIG.COLUMNS.MONTH }, (_, i) => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return { day: i + 1, isWeekend, date: d };
      });
    } else if (zoomLevel === 'day') {
      return Array.from({ length: TIMELINE_CONFIG.COLUMNS.DAY }, (_, i) => ({ hour: i }));
    } else {
      return Array.from({ length: TIMELINE_CONFIG.COLUMNS.TIME }, (_, i) => ({ minute: i }));
    }
  };

  const headers = getColumnHeaders();
  const isZoomMin = zoomValue === TIMELINE_CONFIG.ZOOM.MIN;
  const isZoomMax = zoomValue === TIMELINE_CONFIG.ZOOM.MAX;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      <div className="lg:pl-[240px] pb-[80px]">
        
        {/* Enhanced Header */}
        <header className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-30 shadow-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] md:text-xl font-black tracking-tighter">TIMELINE MONITOR</h1>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 px-1.5 py-0.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border)]">v4.0</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-bold opacity-30">{new Date().toLocaleDateString('th-TH')}</span>
            </div>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[var(--bg-inset)] p-1 rounded-xl">
              <button 
                onClick={() => handleZoomChange(zoomValue - 1)}
                disabled={isZoomMin}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 px-2">
                {TIMELINE_CONFIG.ZOOM.LABELS.map((level, idx) => (
                  <div 
                    key={level}
                    className={`w-2 h-2 rounded-full transition-all ${zoomValue === idx ? 'bg-[var(--accent)] scale-125' : 'bg-slate-300 dark:bg-slate-600'}`}
                  />
                ))}
              </div>
              <button 
                onClick={() => handleZoomChange(zoomValue + 1)}
                disabled={isZoomMax}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-[1px] h-6 bg-[var(--border)]" />
            
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">ActiveNow</span>
              <span className="text-sm md:text-lg font-black leading-none">{stats.working}/{stats.total}</span>
            </div>
            <div className="w-[1px] h-6 bg-[var(--border)]" />
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]"
            >
              <HistoryIcon className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        <main className="p-3 md:p-4 space-y-4 max-w-[1600px] mx-auto">
          
          {/* Recent History (Expandable) */}
          <AnimatePresence>
            {isHistoryExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="card p-3 space-y-3 bg-[var(--bg-inset)] border-dashed">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 px-1">Real-time Activity Flow</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {records.slice(0, TIMELINE_CONFIG.DISPLAY.HISTORY_RECORDS_COUNT).map(r => (
                      <div key={r._id} className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                        <UserAvatar imageUrl={r.userImage} displayName={r.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black truncate">{r.userName}</p>
                          <p className="text-[8px] font-bold opacity-40 uppercase">{new Date(r.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} · {r.type}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${r.type === 'in' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                      </div>
                    ))}
                    {records.length === 0 && <p className="text-[10px] opacity-30 italic col-span-full py-4 text-center">No recent records</p>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline View */}
          <div className="card-neo overflow-hidden flex flex-col min-h-[500px] md:min-h-[600px]">
            {/* Timeline Controls */}
            <div className="px-3 py-3 md:px-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-40 bg-[var(--bg-inset)] px-2 py-1 rounded-lg">
                   {zoomLevel.toUpperCase()} VIEW
                 </span>
               </div>
               
               <div className="flex items-center gap-3">
                  <button 
                    onClick={goToToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-[var(--accent)] text-white shadow-md hover:opacity-90 transition-opacity"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Today
                  </button>
                  <button onClick={() => navigateDate('prev')} className="w-8 h-8 rounded-full bg-[var(--bg-inset)] flex items-center justify-center text-muted hover:text-[var(--text-primary)] transition-colors">
                    <ChevronRight className="rotate-180 w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[140px] md:min-w-[180px]">
                    <p className="text-[12px] md:text-[14px] font-black text-[var(--accent)] leading-tight">
                      {getDateRange()}
                    </p>
                  </div>
                  <button onClick={() => navigateDate('next')} className="w-8 h-8 rounded-full bg-[var(--bg-inset)] flex items-center justify-center text-muted hover:text-[var(--text-primary)] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Timeline Scrollable Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative h-[550px] md:h-[650px] bg-[var(--bg-inset)]/20">
               {/* Header */}
               <div className="flex flex-col border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-20 shadow-sm">
                  {/* Tier 1: Period */}
                  <div className="flex border-b border-[var(--border)]/50">
                    <div className="w-[140px] md:w-[200px] shrink-0 p-3 border-r border-[var(--border)] bg-slate-50 dark:bg-slate-900 sticky left-0 z-30 flex items-center">
                       <span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-slate-400">STAFF LIST</span>
                    </div>
                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center py-2">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                          {zoomLevel === 'month' ? viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : 
                           zoomLevel === 'day' ? viewDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) :
                           `${viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - Hour View`}
                       </span>
                    </div>
                  </div>
                  
                  {/* Tier 2: Columns */}
                  <div className="flex">
                    <div className="w-[140px] md:w-[200px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-30" />
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                      <div className="flex h-9 bg-white/40 dark:bg-black/10 min-w-max">
                        {zoomLevel === 'month' && headers.map((h: any) => (
                          <div 
                            key={h.day} 
                            className={`flex-1 min-w-[28px] md:min-w-[36px] flex items-center justify-center border-r border-[var(--border)]/20 ${h.isWeekend ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}
                          >
                             <span className={`text-[8px] md:text-[9px] font-black ${h.isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>{h.day}</span>
                          </div>
                        ))}
                        {zoomLevel === 'day' && headers.map((h: any) => (
                          <div key={h.hour} className="flex-1 min-w-[35px] md:min-w-[50px] flex items-center justify-center border-r border-[var(--border)]/20">
                             <span className="text-[8px] md:text-[9px] font-black text-slate-400">{h.hour}</span>
                          </div>
                        ))}
                        {zoomLevel === 'time' && headers.map((h: any) => (
                          <div key={h.minute} className="flex-1 min-w-[10px] md:min-w-[12px] flex items-center justify-center border-r border-[var(--border)]/10">
                             <span className="text-[6px] md:text-[7px] font-black text-slate-300">{h.minute % 10 === 0 ? h.minute : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>

               {/* Scrollable Content */}
               <div ref={timelineRef} className="flex-1 overflow-auto custom-scrollbar relative bg-gantt-grid">
                  {timelineData.length === 0 && loading ? (
                    <div className="flex items-center justify-center h-full opacity-30 text-[11px] font-bold uppercase tracking-widest">Loading...</div>
                  ) : timelineData.map((user, userIdx) => {
                    const isActive = user.groups.some(g => !g.end);
                    const noActivity = user.groups.length === 0;
                    const isSelected = selectedUser === user.id;

                    return (
                      <motion.div 
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: userIdx * (TIMELINE_CONFIG.ANIMATION.DELAY_PER_ITEM / 1000) }}
                        className={`flex border-b border-[var(--border)]/30 group transition-colors min-h-[56px] cursor-pointer ${noActivity ? 'bg-slate-50/20 dark:bg-slate-900/10' : ''} ${isSelected ? 'bg-[var(--accent)]/5' : ''}`}
                        onClick={() => setSelectedUser(isSelected ? null : user.id)}
                      >
                         {/* Fixed Left Column */}
                         <div className="w-[140px] md:w-[200px] shrink-0 p-2 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 flex items-center gap-2 md:gap-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${isActive ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center font-black text-[10px] md:text-[11px] shrink-0 relative`}>
                               {user.image ? (
                                 <img src={user.image} className="w-full h-full rounded-lg object-cover" alt="" />
                               ) : (
                                 <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{user.name.charAt(0)}</span>
                               )}
                               {isActive && (
                                 <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
                               )}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[11px] md:text-[12px] font-black truncate text-slate-700 dark:text-slate-200">{user.name}</p>
                               <div className="flex items-center gap-1 mt-0.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                  <span className="text-[7px] md:text-[8px] font-bold opacity-40 uppercase truncate">
                                    {isActive ? 'Active' : (noActivity ? 'No Records' : 'Off duty')}
                                  </span>
                               </div>
                            </div>
                         </div>
                          
                         {/* Timeline Tracks */}
                         <div className="flex-1 relative overflow-hidden min-w-max">
                            {user.groups.map((group, idx) => {
                               const { left, width } = getTimelinePosition(group.start, group.end, viewDate, zoomLevel);
                               const isLive = !group.end;
                               
                               return (
                                 <motion.div
                                   key={idx}
                                   initial={{ opacity: 0, scaleX: 0 }}
                                   animate={{ opacity: 1, scaleX: 1 }}
                                   transition={{ delay: idx * (TIMELINE_CONFIG.ANIMATION.DELAY_PER_ITEM / 1000) }}
                                   className="absolute top-1/2 -translate-y-1/2 h-5 md:h-6 rounded-md flex items-center px-1 shadow-sm overflow-hidden cursor-pointer group-hover:scale-[1.02] transition-transform"
                                   style={{ 
                                     left: `${Math.max(0, left)}%`, 
                                     width: `${Math.max(2, width)}%`, 
                                     background: isLive 
                                       ? `linear-gradient(90deg, ${TIMELINE_CONFIG.COLORS.ACTIVE}, ${TIMELINE_CONFIG.COLORS.ACTIVE_LIGHT})`
                                       : `linear-gradient(90deg, ${TIMELINE_CONFIG.COLORS.COMPLETED}, ${TIMELINE_CONFIG.COLORS.COMPLETED_LIGHT})`,
                                     transformOrigin: 'left center'
                                   }}
                                   onMouseEnter={(e) => {
                                     const rect = e.currentTarget.getBoundingClientRect();
                                     const timelineRect = timelineRef.current?.getBoundingClientRect();
                                     if (timelineRect) {
                                       setTooltip({
                                         x: rect.left - timelineRect.left + rect.width / 2,
                                         y: rect.top - timelineRect.top - 10,
                                         userName: user.name,
                                         startTime: group.start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                                         endTime: group.end ? group.end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ปัจจุบัน',
                                         duration: group.end 
                                           ? `${((group.end.getTime() - group.start.getTime()) / (1000 * 60 * 60)).toFixed(1)} ชม.`
                                           : 'กำลังทำงาน',
                                         branch: group.branch || '-'
                                       });
                                     }
                                   }}
                                   onMouseLeave={() => setTooltip(null)}
                                 >
                                    {width > 8 && (
                                      <>
                                        <div className="w-2 h-2 rounded-full bg-white shrink-0 mx-0.5" />
                                        <span className="text-[7px] md:text-[8px] font-black text-white px-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                          {group.start.getHours()}:{group.start.getMinutes().toString().padStart(2,'0')}
                                        </span>
                                      </>
                                    )}
                                 </motion.div>
                               );
                            })}
                            
                            {/* Grid lines for time view */}
                            {zoomLevel === 'time' && (
                              <div className="absolute inset-0 flex pointer-events-none">
                                {Array.from({ length: 12 }, (_, i) => (
                                  <div key={i} className="flex-1 border-r border-[var(--border)]/10" />
                                ))}
                              </div>
                            )}
                         </div>
                      </motion.div>
                    );
                  })}
                  
                  {!loading && timelineData.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-10">
                       <Users className="w-12 h-12 mb-4 opacity-10" />
                       <p className="text-[12px] font-black uppercase tracking-widest">No Leaders Found</p>
                       <p className="text-[10px] font-bold mt-2">Add leaders in management to start monitoring</p>
                    </div>
                  )}
               </div>
            </div>
            
            {/* Footer Stats */}
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between">
               <div className="flex items-center gap-4 text-[10px] md:text-[11px]">
                 <span className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="font-bold opacity-60">Active: <span className="font-black text-emerald-600">{stats.working}</span></span>
                 </span>
                 <span className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-slate-400" />
                   <span className="font-bold opacity-60">Total: <span className="font-black">{stats.total}</span></span>
                 </span>
                 <span className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-indigo-500" />
                   <span className="font-bold opacity-60">Hours: <span className="font-black text-indigo-600">{stats.totalHours}h</span></span>
                 </span>
               </div>
               <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">
                 Real-time Sync Active
               </span>
            </div>
          </div>
        </main>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-50 bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-[10px] md:text-[11px] pointer-events-none"
            style={{ 
              left: tooltip.x, 
              top: tooltip.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <p className="font-black mb-1">{tooltip.userName}</p>
            <div className="space-y-0.5 opacity-80">
              <p>🕐 {tooltip.startTime} - {tooltip.endTime}</p>
              <p>⏱️ {tooltip.duration}</p>
              <p>📍 {tooltip.branch}</p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="admin" />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        
        .bg-gantt-grid {
          background-image: 
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 100% ${TIMELINE_CONFIG.STYLES.ROW_HEIGHT}px, ${zoomLevel === 'month' ? `calc(100% / ${TIMELINE_CONFIG.COLUMNS.MONTH})` : zoomLevel === 'day' ? `calc(100% / ${TIMELINE_CONFIG.COLUMNS.DAY})` : `calc(100% / ${TIMELINE_CONFIG.COLUMNS.TIME})`} 100%;
          background-position: 0 -1px, -1px 0;
          opacity: 0.12;
        }
      `}</style>
    </div>
  );
}
