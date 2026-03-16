'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, LocateFixed, MessageSquare, CheckCircle2 } from 'lucide-react';

interface ClockCardProps {
  timeStr: string;
  dateStr: string;
  distance: number | null;
  isInRange: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  actionLoading: boolean;
  locLoading: boolean;
  onClockAction: (type: 'in' | 'out') => void;
  onRefreshLocation: () => void;
  onRequestCorrection: (type: 'in' | 'out') => void;
}

export function ClockCard({
  timeStr,
  dateStr,
  distance,
  isInRange,
  isClockedIn,
  isClockedOut,
  actionLoading,
  locLoading,
  onClockAction,
  onRefreshLocation,
  onRequestCorrection
}: ClockCardProps) {
  const canClockIn = !isClockedIn && !isClockedOut;
  const canClockOut = isClockedIn && !isClockedOut;

  return (
    <div className="card p-6 flex flex-col gap-6 shadow-xl border-[var(--border)] bg-[var(--bg-surface)] rounded-[32px]">
      {/* Time & Date Display */}
      <div className="text-center">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-black tracking-tighter tabular-nums" 
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {timeStr}
        </motion.p>
        <p className="text-[11px] font-bold opacity-40 uppercase tracking-[0.2em] mt-1">{dateStr}</p>
      </div>

      {/* Distance Status Pill */}
      <div className={`flex items-center justify-center gap-2.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${
        distance === null ? 'bg-[var(--bg-inset)] border-[var(--border)] opacity-50' :
        isInRange ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' :
        'bg-rose-500/10 border-rose-500/25 text-rose-500'
      }`}>
        <MapPin className={`w-3.5 h-3.5 ${distance !== null ? (isInRange ? 'animate-bounce' : 'animate-pulse') : ''}`} />
        {distance === null ? 'Locating...' : isInRange ? `In Range (${Math.round(distance)}m)` : `Out of Range (${Math.round(distance)}m)`}
      </div>

      {/* Action Area */}
      <AnimatePresence mode="wait">
        {isClockedOut ? (
          <motion.div 
            key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 py-6"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Shift Completed</p>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">See you tomorrow!</p>
            </div>
          </motion.div>
        ) : (canClockIn || canClockOut) ? (
          <motion.div key="action" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {isInRange ? (
              <button
                disabled={actionLoading}
                onClick={() => onClockAction(canClockIn ? 'in' : 'out')}
                className={`group relative w-full h-16 rounded-2xl overflow-hidden transition-all active:scale-[0.98] ${
                  canClockIn 
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25' 
                    : 'bg-gradient-to-br from-rose-500 to-orange-600 shadow-lg shadow-rose-500/25'
                }`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-center gap-3 text-white">
                  <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="text-[12px] font-black uppercase tracking-[0.15em]">
                    {actionLoading ? 'Processing...' : `Clock ${canClockIn ? 'In' : 'Out'} Now`}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => onRequestCorrection(canClockIn ? 'in' : 'out')}
                className="w-full h-16 rounded-2xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                Request Correction
              </button>
            )}
            
            <button
              onClick={onRefreshLocation}
              disabled={locLoading}
              className="w-full h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-60 hover:opacity-100 active:scale-95 transition-all"
            >
              <LocateFixed className={`w-3.5 h-3.5 ${locLoading ? 'animate-spin' : ''}`} />
              {locLoading ? 'Updating GPS...' : 'Refresh Location'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
