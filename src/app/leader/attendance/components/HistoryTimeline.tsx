'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Trash2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

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

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-surface)] ${isSidebar ? '' : 'rounded-[32px] border border-[var(--border)] overflow-hidden shadow-lg'}`}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-sm font-black uppercase tracking-widest">Attendance History</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border)] text-[10px] font-black opacity-40 uppercase tracking-widest">
          {pairs.length} sessions
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
        <AnimatePresence mode="popLayout">
          {pairs.length === 0 ? (
            <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
              <HistoryIcon className="w-10 h-10" />
              <p className="text-[10px] font-black uppercase tracking-widest">No history</p>
            </div>
          ) : (
            pairs.map((pair) => (
              <motion.div
                key={pair.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-2xl p-4 group transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
                    {pair.in ? formatDate(pair.in.timestamp) : pair.out ? formatDate(pair.out.timestamp) : '---'}
                  </span>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        if (pair.in) onDeleteRecord(pair.in._id);
                        if (pair.out) onDeleteRecord(pair.out._id);
                      }}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!pair.out && pair.in && (
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      Pending
                    </div>
                  )}
                  {pair.out && (
                    <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Complete
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border)]/50">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-0.5">Clock In</span>
                    {pair.in ? (
                      <span className="text-sm font-black tabular-nums">{formatTime(pair.in.timestamp)}</span>
                    ) : (
                      <button onClick={() => onRequestCorrection('in')} className="text-[9px] font-black text-rose-500 uppercase underline decoration-rose-500/30">Missing In</button>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 opacity-10" />

                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-0.5">Clock Out</span>
                    {pair.out ? (
                      <span className="text-sm font-black tabular-nums">{formatTime(pair.out.timestamp)}</span>
                    ) : (
                      pair.in ? (
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Running...</span>
                         </div>
                      ) : (
                        <button onClick={() => onRequestCorrection('out')} className="text-[9px] font-black text-rose-500 uppercase underline decoration-rose-500/30">Missing Out</button>
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
