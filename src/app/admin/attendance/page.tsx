'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, TrendingUp, Activity, Circle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';
import { formatRelativeTime } from '@/lib/date-utils';

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
  const [filterBranch, setFilterBranch] = useState('all');

  const fetchRecords = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let url = `/api/attendance?date=${today}`;
      if (filterBranch !== 'all') url += `&branch=${filterBranch}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        // Sort by timestamp desc (newest first)
        setRecords((data.records || []).sort((a: AttendanceRecord, b: AttendanceRecord) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterBranch]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Real-time updates
  usePusher('users', [
    { event: 'leader-attendance', callback: fetchRecords }
  ], true);

  // Calculate stats
  const todayClockIns = records.filter(r => r.type === 'in').length;
  const todayClockOuts = records.filter(r => r.type === 'out').length;
  const currentlyWorking = todayClockIns - todayClockOuts;
  const insideGeofence = records.filter(r => r.isInside).length;
  const outsideGeofence = records.filter(r => !r.isInside).length;

  // Group by user to show latest status
  const userLatestStatus = new Map<string, AttendanceRecord>();
  for (const rec of records) {
    if (!userLatestStatus.has(rec.userId)) {
      userLatestStatus.set(rec.userId, rec);
    }
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
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-3 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8" />
                <Users className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-2xl font-extrabold text-emerald-500">{currentlyWorking}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>กำลังทำงาน</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card p-3 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8" />
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-extrabold text-blue-500">{todayClockIns}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Clock In</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-3 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/10 rounded-full -mr-8 -mt-8" />
                <Activity className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                <p className="text-2xl font-extrabold text-slate-500">{todayClockOuts}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>Clock Out</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="card p-3 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full -mr-8 -mt-8" />
                <MapPin className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-2xl font-extrabold text-amber-500">{insideGeofence}</p>
                <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>ในพื้นที่</p>
              </motion.div>
            </div>

            {/* Branch Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button 
                onClick={() => setFilterBranch('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
              >
                ทุกสาขา
              </button>
              {branches.map(b => (
                <button 
                  key={b.code}
                  onClick={() => setFilterBranch(b.code)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterBranch === b.code ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  สาขา {b.code}
                </button>
              ))}
            </div>

            {/* Currently Working Section */}
            {activeUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="w-3 h-3 text-emerald-500 animate-pulse" fill="currentColor" />
                  <h3 className="text-fluid-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    กำลังทำงานอยู่ ({activeUsers.length})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeUsers.map(user => (
                    <div 
                      key={user.userId}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5"
                    >
                      <UserAvatar 
                        imageUrl={user.userImage}
                        displayName={user.userName}
                        size="xs"
                      />
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {user.userName}
                      </span>
                      <span className="text-[9px] font-black text-emerald-500 uppercase">
                        {user.branch}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent Activity List */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
                กิจกรรมล่าสุด
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : records.length === 0 ? (
                <div className="card p-12 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีบันทึกเวลาทำงานวันนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {records.map((rec, idx) => (
                    <motion.div
                      key={rec._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="card p-3 flex items-center gap-3 relative overflow-hidden group"
                    >
                      <div className={`absolute top-0 left-0 w-1 h-full ${rec.type === 'in' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      
                      <UserAvatar 
                        imageUrl={rec.userImage}
                        displayName={rec.userName}
                        size="sm"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="font-black text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
                            {rec.userName}
                          </h4>
                          <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {rec.type === 'in' ? 'IN' : 'OUT'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(rec.timestamp)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {rec.branch}
                          </div>
                        </div>
                        
                        <div className={`text-[8px] font-black mt-0.5 ${rec.isInside ? 'text-emerald-500' : 'text-red-500'}`}>
                          {rec.isInside ? '✓ ในพื้นที่' : `✗ นอกพื้นที่ ${rec.distance.toFixed(0)}ม.`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
