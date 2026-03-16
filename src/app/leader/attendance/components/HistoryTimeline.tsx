'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Trash2, MapPin, ShieldCheck, MapPinned, Briefcase, MessageSquare, ArrowRight, Circle, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  _id: string;
  type: 'in' | 'out';
  timestamp: string;
  branch: string;
  isInside: boolean;
  distance?: number;
  eventType: 'actual' | 'correction';
  status?: string;
  category?: string;
  reason?: string;
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

  if (isSidebar) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-surface)]">
        {/* Sidebar Header */}
        <div className="p-8 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <HistoryIcon className="w-6 h-6 text-[var(--accent)]" />
              History
            </h2>
            <div className="px-3 py-1 rounded-full bg-[var(--bg-inset)] border border-[var(--border)]">
              <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{pairs.length} Sessions</span>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
              Sessions are grouped by In/Out. Delete a session to correct mistakes or recalculate working hours.
            </p>
          </div>
        </div>

        {/* Sidebar Scroller */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6 bg-[var(--bg-base)]/30">
          <AnimatePresence mode="popLayout">
            {pairs.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                <HistoryIcon className="w-12 h-12" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">No history found</p>
              </div>
            ) : (
              pairs.map((pair, idx) => {
                const workingTime = pair.in && pair.out 
                  ? `${Math.floor((new Date(pair.out.timestamp).getTime() - new Date(pair.in.timestamp).getTime()) / 3600000)}h ${Math.floor(((new Date(pair.out.timestamp).getTime() - new Date(pair.in.timestamp).getTime()) % 3600000) / 60000)}m`
                  : null;

                return (
                  <motion.div
                    key={pair.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                  >
                    {/* Visual Accent */}
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent)]/10" />

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                         <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] text-[10px] font-black tracking-tighter opacity-60">
                           {pair.in ? formatDate(pair.in.timestamp) : pair.out ? formatDate(pair.out.timestamp) : '---'}
                         </div>
                      </div>
                      
                      {/* REDESIGNED: High Visibility Delete Button */}
                      <button 
                        onClick={() => {
                          if (pair.in) onDeleteRecord(pair.in._id);
                          if (pair.out) onDeleteRecord(pair.out._id);
                        }}
                        className="h-10 px-4 rounded-xl bg-rose-500 text-white flex items-center gap-2 hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Delete</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Clock In */}
                      <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 flex items-center gap-1.5 justify-start">
                          <div className="w-1 h-1 rounded-full bg-emerald-500" />
                          Clock In
                        </p>
                        {pair.in ? (
                          <div className="space-y-1 text-left">
                            <p className="text-2xl font-black tabular-nums leading-none">
                              {formatTime(pair.in.timestamp)}
                            </p>
                            <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest truncate">{pair.in.branch || '---'}</p>
                          </div>
                        ) : (
                          <button onClick={() => onRequestCorrection('in')} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/20 block w-full text-center">
                            Missing In
                          </button>
                        )}
                      </div>

                      <ArrowRight className="w-4 h-4 opacity-10 shrink-0" />

                      {/* Clock Out */}
                      <div className="flex-1 text-right">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 flex items-center justify-end gap-1.5">
                          Clock Out
                          <div className={`w-1 h-1 rounded-full ${pair.out ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                        </p>
                        {pair.out ? (
                          <div className="space-y-1 text-right">
                            <p className="text-2xl font-black tabular-nums leading-none">
                              {formatTime(pair.out.timestamp)}
                            </p>
                            <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest truncate">{pair.out.branch || '---'}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {pair.in ? (
                              <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10">Active Now</span>
                            ) : (
                              <button onClick={() => onRequestCorrection('out')} className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/20 block w-full text-center">
                                Missing Out
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {workingTime && (
                      <div className="mt-6 pt-4 border-t border-[var(--border)] border-dashed flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-30">Shift Duration</span>
                        <span className="text-xs font-black text-[var(--accent)]">{workingTime}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden bg-[var(--bg-surface)] border-[var(--border)] rounded-[32px] shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--bg-inset)]/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <HistoryIcon className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest block">Attendance Sessions</span>
            <span className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Bird's eye view</span>
          </div>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {pairs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
            <HistoryIcon className="w-12 h-12" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">No history found</p>
          </div>
        ) : (
          pairs.map((pair, idx) => (
            <motion.div 
              key={pair.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 rounded-3xl bg-[var(--bg-inset)] border border-[var(--border)] group/card hover:border-[var(--accent)]/30 transition-all"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]/50">
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-white/5 border border-[var(--border)] text-[10px] font-black tracking-tighter opacity-60">
                    {pair.in ? formatDate(pair.in.timestamp) : pair.out ? formatDate(pair.out.timestamp) : '---'}
                  </div>
                  {!pair.out && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest">
                      <Circle className="w-2 h-2 fill-current animate-pulse" />
                      Active Session
                    </div>
                  )}
                </div>
                {/* Branch Info */}
                <div className="flex items-center gap-1.5 opacity-40">
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{(pair.in?.branch || pair.out?.branch || 'HQ').toUpperCase()}</span>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* Clock IN Side */}
                <div className="relative">
                  {pair.in ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">In</span>
                        <button onClick={() => onDeleteRecord(pair.in!._id)} className="opacity-0 group-hover/card:opacity-100 p-1 text-rose-500/40 hover:text-rose-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <p className="text-xl font-black tabular-nums">{formatTime(pair.in.timestamp)}</p>
                      <div className="flex items-center gap-1 opacity-30 text-[8px] font-bold">
                        {pair.in.isInside ? <ShieldCheck className="w-2.5 h-2.5" /> : <MapPinned className="w-2.5 h-2.5" />}
                        {pair.in.isInside ? 'Auto' : 'Manual'}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => onRequestCorrection('in')} className="w-full h-12 rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center opacity-40 hover:opacity-100 hover:border-[var(--accent)] transition-all">
                      <span className="text-[8px] font-black uppercase tracking-widest">Missing In</span>
                    </button>
                  )}
                </div>

                <ArrowRight className={`w-5 h-5 opacity-10 ${pair.out ? 'text-[var(--accent)] opacity-40' : ''}`} />

                {/* Clock OUT Side */}
                <div className="relative">
                  {pair.out ? (
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Out</span>
                        <button onClick={() => onDeleteRecord(pair.out!._id)} className="opacity-0 group-hover/card:opacity-100 p-1 text-rose-500/40 hover:text-rose-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <p className="text-xl font-black tabular-nums">{formatTime(pair.out.timestamp)}</p>
                      <div className="flex items-center justify-end gap-1 opacity-30 text-[8px] font-bold">
                        {pair.out.isInside ? <ShieldCheck className="w-2.5 h-2.5" /> : <MapPinned className="w-2.5 h-2.5" />}
                        {pair.out.isInside ? 'Auto' : 'Manual'}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => onRequestCorrection('out')} className="w-full h-12 rounded-2xl border border-dashed border-[var(--border)] flex flex-col items-center justify-center opacity-40 hover:opacity-100 hover:border-rose-500 transition-all">
                      <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Wait Out</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status footer for corrections/missions */}
              {(pair.in?.eventType === 'correction' || pair.out?.eventType === 'correction') && (
                <div className="mt-4 pt-3 border-t border-[var(--border)]/30 flex items-center gap-3">
                  <div className="flex -space-x-1">
                    {pair.in?.eventType === 'correction' && (
                      <div className={`w-5 h-5 rounded-full border border-[var(--bg-inset)] flex items-center justify-center ${pair.in.category === 'offsite' ? 'bg-violet-500' : 'bg-amber-500'}`}>
                        {pair.in.category === 'offsite' ? <Briefcase className="w-2.5 h-2.5 text-white" /> : <MessageSquare className="w-2.5 h-2.5 text-white" />}
                      </div>
                    )}
                    {pair.out?.eventType === 'correction' && (
                      <div className={`w-5 h-5 rounded-full border border-[var(--bg-inset)] flex items-center justify-center ${pair.out.category === 'offsite' ? 'bg-violet-500' : 'bg-amber-500'}`}>
                        {pair.out.category === 'offsite' ? <Briefcase className="w-2.5 h-2.5 text-white" /> : <MessageSquare className="w-2.5 h-2.5 text-white" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 truncate">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Reason</p>
                    <p className="text-[10px] font-bold truncate italic">"{pair.in?.reason || pair.out?.reason}"</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                    (pair.in?.status === 'approved' || pair.out?.status === 'approved') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    (pair.in?.status === 'rejected' || pair.out?.status === 'rejected') ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}>
                    {pair.in?.status || pair.out?.status || 'Pending'}
                  </div>
                </div>
              )}
            </motion.div>
          ))
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
