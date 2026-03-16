'use client';

import { motion } from 'framer-motion';
import { History as HistoryIcon, Trash2, MapPin, ShieldCheck, MapPinned } from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  branch: string;
  isInside: boolean;
  distance?: number;
}

interface HistoryTimelineProps {
  records: AttendanceRecord[];
  onDeleteRecord: (id: string) => void;
}

export function HistoryTimeline({ records, onDeleteRecord }: HistoryTimelineProps) {
  return (
    <div className="card overflow-hidden bg-[var(--bg-surface)] border-[var(--border)] rounded-[28px] shadow-lg">
      <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--bg-inset)]/30">
        <div className="flex items-center gap-2.5">
          <HistoryIcon className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Personal Timeline</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-inset)] border border-[var(--border)] text-[8px] font-black opacity-30 uppercase tracking-widest">Today</span>
      </div>

      <div className="max-h-[400px] overflow-y-auto p-6 custom-scrollbar relative">
        {records.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3 opacity-20">
            <HistoryIcon className="w-10 h-10" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No records found today</p>
          </div>
        ) : (
          <div className="relative pl-8 space-y-8">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-1.5 bottom-1.5 w-[2px] bg-gradient-to-b from-[var(--border)] via-[var(--border)] to-transparent" />
            
            {records.map((rec, idx) => (
              <motion.div 
                key={rec._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative group"
              >
                {/* Timeline Dot */}
                <div className={`absolute -left-[27px] top-1 w-5 h-5 rounded-full border-4 border-[var(--bg-surface)] z-10 shadow-sm
                  ${rec.type === 'in' 
                    ? 'bg-emerald-500 shadow-emerald-500/20' 
                    : 'bg-rose-500 shadow-rose-500/20'}`} 
                />
                
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <p className={`text-[12px] font-black uppercase tracking-tight ${rec.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        Clock {rec.type.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)]">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-black text-amber-600/70">@{rec.branch || 'AYA'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-[13px] font-black tracking-tight tabular-nums opacity-80">
                        {new Date(rec.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
                        <span className="text-[10px] font-bold opacity-30 ml-1">น.</span>
                      </p>
                      <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                        rec.isInside 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {rec.isInside ? <ShieldCheck className="w-2.5 h-2.5" /> : <MapPinned className="w-2.5 h-2.5" />}
                        {rec.isInside ? 'Verified' : 'Out of bounds'}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => onDeleteRecord(rec._id)} 
                    className="p-2 rounded-xl text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}
