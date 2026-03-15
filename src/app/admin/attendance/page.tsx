'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Search, User, Filter, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import UserAvatar from '@/components/UserAvatar';
import { usePusher } from '@/hooks/usePusher';

export default function AttendanceMonitorPage() {
  const { branches } = useBranches();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('all');

  const fetchRecords = async () => {
    try {
      let url = '/api/attendance';
      if (filterBranch !== 'all') url += `?branch=${filterBranch}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterBranch]);

  usePusher('users', [
    { event: 'leader-attendance', callback: () => fetchRecords() }
  ]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      <div className="lg:pl-[240px] pb-6">
        <PageHeader title="ตรวจสอบเวลาทำงาน" subtitle="ติดตามการเข้า-ออกงานของ Leader ทุกสาขา" backHref="/admin/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* Filters */}
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

            {/* List */}
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                   <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : records.length === 0 ? (
                <div className="card p-12 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีบันทึกเวลาทำงาน</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {records.map((rec) => (
                    <motion.div
                      key={rec._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="card p-4 flex items-center gap-4 relative overflow-hidden group"
                    >
                      <div className={`absolute top-0 right-0 w-1 h-full ${rec.type === 'in' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-[var(--border)]">
                        <UserAvatar displayName={rec.userName} size="md" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-fluid-sm truncate" style={{ color: 'var(--text-primary)' }}>{rec.userName}</h4>
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {rec.type === 'in' ? 'Clock In' : 'Clock Out'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(rec.timestamp).toLocaleTimeString('th-TH')} น.
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {rec.branch}
                          </div>
                          <div className={`flex items-center gap-1 ${rec.isInside ? 'text-emerald-500' : 'text-red-500'}`}>
                            {rec.isInside ? '(ในพื้นที่)' : `(นอกพื้นที่ ${rec.distance.toFixed(0)}ม.)`}
                          </div>
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
