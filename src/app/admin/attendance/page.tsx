'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users, TrendingUp, Activity, ChevronRight, History as HistoryIcon, Calendar, User, Search } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';
import BottomNav from '@/components/BottomNav';

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

export default function AttendanceMonitorPage() {
  const { branches } = useBranches();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<'day' | 'month'>('day');
  const [viewDate, setViewDate] = useState(new Date());

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      // For Month view, fetch a wider range. For Day view, just today.
      const start = new Date(viewDate);
      if (zoomLevel === 'month') {
        start.setDate(1);
      }
      const dateStr = start.toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?date=${dateStr}&range=${zoomLevel}`);
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
    fetchRecords();
  }, [fetchRecords]);

  usePusher('users', [{ event: 'leader-attendance', callback: fetchRecords }], true);

  // Process data for Timeline
  const timelineData = useMemo(() => {
    const userMap = new Map<string, { name: string; image?: string; groups: { start: Date; end: Date | null }[] }>();
    
    const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sorted.forEach(rec => {
      if (!userMap.has(rec.userId)) {
        userMap.set(rec.userId, { name: rec.userName, image: rec.userImage, groups: [] });
      }
      const userData = userMap.get(rec.userId)!;
      if (rec.type === 'in') {
        userData.groups.push({ start: new Date(rec.timestamp), end: null });
      } else {
        const lastGroup = userData.groups[userData.groups.length - 1];
        if (lastGroup && !lastGroup.end) {
          lastGroup.end = new Date(rec.timestamp);
        }
      }
    });

    return Array.from(userMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [records]);

  const stats = useMemo(() => {
    const ins = records.filter(r => r.type === 'in').length;
    const outs = records.filter(r => r.type === 'out').length;
    return { working: ins - outs, inside: records.filter(r => r.isInside).length };
  }, [records]);

  // Timeline Helper: 0-24 Hours
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      <div className="lg:pl-[240px] pb-[80px]">
        
        {/* Compact Header */}
        <header className="px-4 pt-6 pb-2 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-black tracking-tighter">TIMELINE MONITOR</h1>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Monitoring 2.0 / {new Date().toLocaleDateString('th-TH')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active</span>
               <span className="text-lg font-black leading-none">{stats.working}</span>
            </div>
            <div className="w-[1px] h-6 bg-[var(--border)] hidden md:block" />
            <button 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]"
            >
              <HistoryIcon className={`w-5 h-5 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        <main className="p-4 space-y-4 max-w-7xl mx-auto">
          
          {/* Recent History (Expandable) */}
          <AnimatePresence>
            {isHistoryExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="card p-4 space-y-3 bg-[var(--bg-inset)] border-dashed">
                  <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50 px-1">Recent Logs</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {records.slice(0, 6).map(r => (
                      <div key={r._id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
                        <UserAvatar imageUrl={r.userImage} displayName={r.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black truncate">{r.userName}</p>
                          <p className="text-[9px] font-bold opacity-40 uppercase">{new Date(r.timestamp).toLocaleTimeString()} · {r.type}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${r.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timeline View */}
          <div className="card-neo overflow-hidden flex flex-col min-h-[500px]">
            {/* Timeline Tools */}
            <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setZoomLevel('day')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${zoomLevel === 'day' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-inset)] opacity-40'}`}
                  >
                    Daily
                  </button>
                  <button 
                    onClick={() => setZoomLevel('month')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${zoomLevel === 'month' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-inset)] opacity-40'}`}
                  >
                    Monthly
                  </button>
               </div>
               
               <div className="flex items-center gap-3">
                  <button onClick={() => {
                    const d = new Date(viewDate);
                    if (zoomLevel === 'month') d.setMonth(d.getMonth() - 1);
                    else d.setDate(d.getDate() - 1);
                    setViewDate(d);
                  }} className="text-muted hover:text-[var(--text-primary)] transition-colors">
                    <ChevronRight className="rotate-180 w-5 h-5" />
                  </button>
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-black uppercase tracking-widest">
                      {zoomLevel === 'month' 
                        ? viewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
                        : viewDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => {
                    const d = new Date(viewDate);
                    if (zoomLevel === 'month') d.setMonth(d.getMonth() + 1);
                    else d.setDate(d.getDate() + 1);
                    setViewDate(d);
                  }} className="text-muted hover:text-[var(--text-primary)] transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {/* Timeline Scrollable Area with Fixed Column */}
            <div className="flex-1 overflow-hidden flex flex-col relative h-[600px]">
               {/* Fixed Header Row */}
               <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)] sticky top-0 z-20">
                  <div className="w-[160px] shrink-0 p-3 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-30">
                     <span className="text-[10px] font-black opacity-30 uppercase">Staff Member</span>
                  </div>
                  <div className="flex-1 overflow-x-hidden relative">
                    <div className="flex h-10 px-4">
                       {zoomLevel === 'day' ? (
                         Array.from({ length: 25 }, (_, i) => (
                           <div key={i} className="flex-1 min-w-[60px] flex items-center justify-center border-r last:border-r-0 border-[var(--border)]/30">
                              <span className="text-[9px] font-black opacity-30">{i.toString().padStart(2, '0')}:00</span>
                           </div>
                         ))
                       ) : (
                         Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }, (_, i) => (
                           <div key={i} className="flex-1 min-w-[40px] flex items-center justify-center border-r last:border-r-0 border-[var(--border)]/30">
                              <span className="text-[9px] font-black opacity-30">{i + 1}</span>
                           </div>
                         ))
                       )}
                    </div>
                  </div>
               </div>

               {/* Scrollable Content */}
               <div className="flex-1 overflow-auto custom-scrollbar relative">
                  {timelineData.map(user => (
                    <div key={user.id} className="flex border-b border-[var(--border)]/50 group hover:bg-[var(--bg-inset)]/20 transition-colors">
                       {/* Fixed Left Column */}
                       <div className="w-[160px] shrink-0 p-3 border-r border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 flex items-center gap-2 group-hover:bg-[var(--bg-inset)] transition-colors">
                          <UserAvatar imageUrl={user.image} displayName={user.name} size="xs" />
                          <div className="min-w-0">
                             <p className="text-[10px] font-black truncate leading-none">{user.name}</p>
                             <p className="text-[7px] font-bold opacity-30 uppercase mt-0.5">Leader</p>
                          </div>
                       </div>
                       
                       {/* Timeline Tracks */}
                       <div className="flex-1 relative h-14 bg-[var(--bg-inset)]/10">
                          {user.groups.map((group, idx) => {
                             let left = 0;
                             let width = 0;

                             if (zoomLevel === 'day') {
                               const startH = group.start.getHours() + group.start.getMinutes() / 60;
                               const effectiveEnd = group.end || (viewDate.toDateString() === new Date().toDateString() ? new Date() : new Date(viewDate.setHours(23,59,59)));
                               const endH = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;
                               left = (startH / 24) * 100;
                               width = ((endH - startH) / 24) * 100;
                             } else {
                               const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                               const startD = group.start.getDate() - 1 + group.start.getHours() / 24;
                               const effectiveEnd = group.end || new Date(viewDate.getFullYear(), viewDate.getMonth(), daysInMonth, 23, 59);
                               const endD = effectiveEnd.getDate() - 1 + effectiveEnd.getHours() / 24;
                               left = (startD / daysInMonth) * 100;
                               width = ((endD - startD) / daysInMonth) * 100;
                             }

                             const isLive = !group.end;

                             return (
                               <motion.div
                                 key={idx}
                                 initial={{ scaleX: 0 }}
                                 animate={{ scaleX: 1 }}
                                 className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full shadow-lg"
                                 style={{ 
                                   left: `${Math.max(0, left)}%`, 
                                   width: `${Math.max(1, width)}%`, 
                                   background: isLive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'var(--text-muted)',
                                   opacity: isLive ? 1 : 0.3,
                                   transformOrigin: 'left',
                                   boxShadow: isLive ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                                 }}
                               >
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-full z-10">
                                     <span className="text-[7px] font-black text-white px-1 whitespace-nowrap">
                                        {group.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                     </span>
                                  </div>
                               </motion.div>
                             );
                          })}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav role="admin" />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        :root { --emerald: #10b981; --emerald-glow: rgba(16, 185, 129, 0.4); }
      `}</style>
    </div>
  );
}
