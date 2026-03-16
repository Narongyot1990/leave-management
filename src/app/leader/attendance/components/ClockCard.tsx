'use client';

import { motion } from 'framer-motion';
import { MapPin, Navigation, Send } from 'lucide-react';
import SlideButton from './SlideButton';

interface ClockCardProps {
  timeStr: string;
  displayDistance: string;
  isInRange: boolean;
  lastRecordType: 'in' | 'out' | null;
  actionLoading: boolean;
  onClockAction: (type: 'in' | 'out') => Promise<void>;
  onRequestCorrection: (type: 'in' | 'out') => void;
}

export function ClockCard({ 
  timeStr, displayDistance, isInRange, 
  lastRecordType, actionLoading,
  onClockAction, onRequestCorrection 
}: ClockCardProps) {
  const isClockedIn = lastRecordType === 'in';

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Current Time</span>
          <h2 className="text-4xl font-black tracking-tighter tabular-nums leading-none dark:text-white">
            {timeStr}
          </h2>
        </div>
        
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-1.5 border ${
            isInRange ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            <div className={`w-1 h-1 rounded-full ${isInRange ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isInRange ? 'In Area' : 'Outside'}
          </div>
          <p className="text-[10px] font-bold opacity-40 flex items-center justify-end gap-1">
            <Navigation className="w-2.5 h-2.5" />
            {displayDistance}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isInRange ? (
          <SlideButton 
            onSuccess={async () => {
              const nextType = isClockedIn ? 'out' : 'in';
              await onClockAction(nextType);
            }}
            isLoading={actionLoading}
            lastType={lastRecordType}
            isInRange={true}
          />
        ) : (
          <button 
            onClick={() => onRequestCorrection(isClockedIn ? 'out' : 'in')}
            className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg"
          >
            <Send className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              Request {isClockedIn ? 'Clock Out' : 'Clock In'}
            </span>
          </button>
        )}

        <div className="flex items-center justify-center gap-2 opacity-20">
          <MapPin className="w-3 h-3" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">GPS Tracking Active</span>
        </div>
      </div>
    </div>
  );
}
