'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users, TrendingUp, Activity, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';

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

interface UserFilter {
  id: string;
  name: string;
  role: string;
  image?: string;
}

export default function AttendanceMonitorPage() {
  const { branches } = useBranches();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [availableUsers, setAvailableUsers] = useState<UserFilter[]>([]);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=all');
      const data = await res.json();
      if (data.success) {
        setAvailableUsers(data.users
          .filter((u: any) => u.role === 'leader' || u.role === 'admin')
          .map((u: any) => ({
            id: u._id,
            name: u.name || u.lineDisplayName,
            role: u.role,
            image: u.lineProfileImage
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      let url = `/api/attendance?date=${today}`;
      if (filterBranch !== 'all') url += `&branch=${filterBranch}`;
      if (filterUser !== 'all') url += `&userId=${filterUser}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords((data.records || []).sort((a: AttendanceRecord, b: AttendanceRecord) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterBranch, filterUser]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Real-time updates
  usePusher('users', [
    { event: 'leader-attendance', callback: fetchRecords }
  ], true);

  const toggleExpand = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stats
  const todayClockIns = records.filter(r => r.type === 'in').length;
  const todayClockOuts = records.filter(r => r.type === 'out').length;
  const currentlyWorking = todayClockIns - todayClockOuts;
  const insideGeofence = records.filter(r => r.isInside).length;

  // Group by user
  const userLatestStatus = new Map<string, AttendanceRecord>();
  for (const rec of [...records].reverse()) {
    userLatestStatus.set(rec.userId, rec);
  }
  const activeUsers = Array.from(userLatestStatus.values()).filter(r => r.type === 'in');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      <div className="lg:pl-[240px] pb-6">
        <PageHeader 
          title="ติดตามเวลาทำงาน" 
          subtitle={`Real-time · วันนี้ ${records.length} รายการ`}
          backHref="/admin/home" 
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-6xl mx-auto space-y-4">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'กำลังทำงาน', val: currentlyWorking, icon: Users, color: 'emerald' },
                { label: 'Clock In', val: todayClockIns, icon: TrendingUp, color: 'blue' },
                { label: 'Clock Out', val: todayClockOuts, icon: Activity, color: 'slate' },
                { label: 'ในพื้นที่', val: insideGeofence, icon: MapPin, color: 'amber' }
              ].map((stat, idx) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card p-4 text-center relative overflow-hidden group border-b-[3px]"
                  style={{ borderBottomColor: `var(--${stat.color})` }}
                >
                  <div className={`absolute top-0 right-0 w-12 h-12 bg-${stat.color}-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150`} />
                  <stat.icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}-500`} />
                  <p className={`text-3xl font-black text-${stat.color}-500 tabular-nums`}>{stat.val}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Filter Section */}
            <div className="card p-3 flex flex-wrap gap-4 items-center justify-between">
               <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button 
                    onClick={() => setFilterBranch('all')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filterBranch === 'all' ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20' : 'bg-surface text-muted border-border'}`}
                  >
                    ทุกสาขา
                  </button>
                  {branches.map(b => (
                    <button 
                      key={b.code}
                      onClick={() => setFilterBranch(b.code)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filterBranch === b.code ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20' : 'bg-surface text-muted border-border'}`}
                    >
                      {b.code}
                    </button>
                  ))}
               </div>

               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-muted uppercase tracking-widest">Filter:</span>
                  <select 
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="bg-inset text-[11px] font-bold h-8 rounded-lg px-2 border-none ring-1 ring-border focus:ring-accent outline-none min-w-[140px]"
                  >
                    <option value="all">ทุกคน (All Staff)</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Active Workers - The Monitoring Board */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card p-6 overflow-hidden relative border-t-4 border-t-emerald-500 shadow-2xl shadow-emerald-500/5"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full -mr-32 -mt-32" />
              
              <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                   <Activity className="w-6 h-6 text-emerald-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Real-time Monitoring Board
                  </h3>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    สถานะการปฏิบัติงานปัจจุบัน ({activeUsers.length} คน)
                  </p>
                </div>
              </div>

              {activeUsers.length === 0 ? (
                <div className="py-12 text-center bg-inset rounded-[32px] border border-dashed border-border lg:mx-20">
                   <Users className="w-10 h-10 mx-auto mb-4 opacity-20" />
                   <p className="text-xs font-bold text-muted uppercase tracking-tighter italic">ไม่พบพนักงานที่กำลังปฏิบัติงานในขณะนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative">
                  {activeUsers.map(user => (
                    <motion.div 
                      key={user.userId}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="group relative flex flex-col p-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] transition-all"
                    >
                      <div className="flex items-center gap-4 mb-4">
                         <div className="relative">
                            <UserAvatar 
                              imageUrl={user.userImage}
                              displayName={user.userName}
                              size="md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--bg-surface)] shadow-lg shadow-emerald-500/50" />
                         </div>
                         <div className="min-w-0 flex-1">
                            <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
                              {user.userName}
                            </p>
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">
                              {user.branch}
                            </p>
                         </div>
                      </div>

                      <div className="mt-auto pt-3 border-t border-emerald-500/10 flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(user.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                         </div>
                         <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Now</span>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Log */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>กิจกรรมล่าสุด (Activity Log)</h3>
                <div className="h-[1px] flex-1 ml-4 bg-gradient-to-r from-[var(--border)] to-transparent opacity-50" />
              </div>
              
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-10 h-10 rounded-full border-[3px] border-border border-t-accent animate-spin" />
                </div>
              ) : records.length === 0 ? (
                <div className="p-20 text-center bg-inset rounded-[40px] border border-dashed border-border group overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />
                   <Clock className="w-10 h-10 mx-auto mb-4 opacity-20 group-hover:scale-110 transition-transform" />
                   <p className="text-sm font-bold opacity-40 italic">ไม่พบข้อมูลบันทึกเวลาสำหรับเงื่อนไขนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {records.map((rec, idx) => {
                    const isExpanded = expandedRecords.has(rec._id);
                    return (
                      <motion.div
                        key={rec._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`card p-4 relative overflow-hidden group hover:shadow-xl transition-all border-l-4 ${rec.type === 'in' ? 'border-l-emerald-500' : 'border-l-slate-400'}`}
                      >
                        <div className="flex items-center gap-4">
                          <UserAvatar 
                            imageUrl={rec.userImage}
                            displayName={rec.userName}
                            size="md"
                            className="group-hover:scale-105 transition-transform"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                               <h4 className="font-black text-sm truncate pr-2" style={{ color: 'var(--text-primary)' }}>
                                 {rec.userName}
                               </h4>
                               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                 {rec.type === 'in' ? 'IN' : 'OUT'}
                               </span>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1.5">
                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted bg-inset px-2 py-0.5 rounded-md border border-border/50">
                                  <Clock className="w-3 h-3" />
                                  {new Date(rec.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                               </div>
                               <button 
                                 onClick={() => toggleExpand(rec._id)}
                                 className="flex items-center gap-1 text-[9px] font-black uppercase text-accent hover:underline ml-auto"
                               >
                                 {isExpanded ? 'Hide' : 'Info'}
                                 <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                               </button>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">Location Details</p>
                                  <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                    <MapPin className="w-3.5 h-3.5 text-accent" />
                                    {rec.branch}
                                  </div>
                                  <p className={`text-[10px] font-black uppercase ${rec.isInside ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {rec.isInside ? 'พิกัดถูกต้อง' : `นอกพื้นที่ ${Math.round(rec.distance)}ม.`}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-muted">GPS Logs</p>
                                  <p className="font-mono text-[9px] text-muted">Lat: {rec.location.lat.toFixed(6)}</p>
                                  <p className="font-mono text-[9px] text-muted">Lon: {rec.location.lon.toFixed(6)}</p>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-border/20">
                                   <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Full Timestamp</p>
                                   <p className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                      {new Date(rec.timestamp).toLocaleString('th-TH', { 
                                        day: '2-digit', month: 'short', year: 'numeric', 
                                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                                      })} น.
                                   </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
