'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Trash2, ArrowRight, Clock } from 'lucide-react';

interface TimelineEvent {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  branch: string;
  eventType: 'actual' | 'correction';
}

interface AttendancePair {
  in?: TimelineEvent;
  out?: TimelineEvent;
  id: string;
}

interface HistoryTimelineProps {
  pairs: AttendancePair[];
  onDeleteRecord: (id: string) => void;
  onRequestCorrection: (type: 'in' | 'out') => void;
  isSidebar?: boolean;
}

export function HistoryTimeline({ pairs, onDeleteRecord, onRequestCorrection, isSidebar = false }: HistoryTimelineProps) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  const getSessionDuration = (inTs: string, outTs: string) => {
    const diff = new Date(outTs).getTime() - new Date(inTs).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-surface)] ${isSidebar ? '' : 'rounded-[32px] border border-[var(--border)] overflow-hidden shadow-xl'}`}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-black uppercase tracking-widest">Attendance History</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border)] text-[9px] font-black opacity-40 uppercase tracking-widest tabular-nums">
          {pairs.length} Sessions
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        <AnimatePresence mode="popLayout">
          {pairs.length === 0 ? (
            <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-[var(--bg-inset)] flex items-center justify-center">
                <HistoryIcon className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest">No activity found</p>
            </div>
          ) : (
            pairs.map((pair) => (
              <motion.div
                key={pair.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-[24px] overflow-hidden group hover:shadow-lg transition-all"
              >
                <div className="p-4 bg-[var(--bg-surface)]/40 border-b border-[var(--border)]/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] text-[10px] font-black">
                      {pair.in ? formatDate(pair.in.timestamp) : pair.out ? formatDate(pair.out.timestamp) : '---'}
                    </div>
                    {pair.in && pair.out && (
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-widest tabular-nums">
                        {getSessionDuration(pair.in.timestamp, pair.out.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 translate-x-1 group-hover:translate-x-0 transition-transform">
                    <button 
                      onClick={() => onRequestCorrection(pair.in ? 'out' : 'in')}
                      className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/10"
                      title="Request Correction"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (!confirm('ยืนยันการลบรายการนี้?')) return;
                        if (pair.in) onDeleteRecord(pair.in._id);
                        if (pair.out) onDeleteRecord(pair.out._id);
                      }}
                      className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">In</span>
                    {pair.in ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-black tabular-nums">{formatTime(pair.in.timestamp)}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-rose-500/60 italic">Missing</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-4 h-4 opacity-5" />
                  </div>

                  <div className="flex-1 flex flex-col gap-1 text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">Out</span>
                    {pair.out ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-black tabular-nums">{formatTime(pair.out.timestamp)}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      </div>
                    ) : (
                      pair.in ? (
                        <div className="flex items-center gap-1.5 justify-end">
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Running</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-rose-500/60 italic">Missing</span>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}
