'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock } from 'lucide-react';

interface StatusBannerProps {
  isClockedIn: boolean;
  isClockedOut: boolean;
  workingTime: string | null;
}

export function StatusBanner({ isClockedIn, isClockedOut, workingTime }: StatusBannerProps) {
  return (
    <div className="mb-4">
      <AnimatePresence mode="wait">
        {isClockedOut ? (
          <motion.div 
            key="done" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Shift Completed</p>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">Total Time: {workingTime}</p>
            </div>
          </motion.div>
        ) : isClockedIn ? (
          <motion.div 
            key="active" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 shadow-sm"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-[var(--bg-surface)]" />
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Working Now</p>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{workingTime}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="waiting" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] opacity-60"
          >
            <Clock className="w-6 h-6 opacity-20 ml-2" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Waiting for first clock-in</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
