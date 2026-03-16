'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, LocateFixed, MessageSquare, CheckCircle2, Briefcase, Navigation, Locate, AlertCircle } from 'lucide-react';

import SlideButton from './SlideButton';

interface ClockCardProps {
  timeStr: string;
  dateStr: string;
  displayDistance: string;
  isInRange: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  lastRecordType: 'in' | 'out' | null;
  actionLoading: boolean;
  locLoading: boolean;
  compact?: boolean;
  onClockAction: (type: 'in' | 'out') => Promise<void>;
  onRefreshLocation: () => void;
  onRequestCorrection: (type: 'in' | 'out') => void;
}

export function ClockCard({ 
  timeStr, dateStr, displayDistance, isInRange, 
  isClockedIn, isClockedOut, lastRecordType,
  actionLoading, locLoading, compact = false,
  onClockAction, onRefreshLocation, onRequestCorrection 
}: ClockCardProps) {
  if (compact) {
    return (
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden">
        {/* Animated Background Glow */}
        <div className={`absolute -top-32 -right-32 w-64 h-64 blur-[100px] transition-colors duration-1000 ${isClockedIn ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Live Time</span>
              <h2 className="text-5xl font-black tracking-tighter tabular-nums leading-none">
                {timeStr}
              </h2>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider mb-2 border ${isInRange ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isInRange ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {isInRange ? 'In Range' : 'Out of Range'}
              </div>
              <p className="text-[11px] font-bold opacity-60 flex items-center justify-end gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                {displayDistance}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <SlideButton 
              onSuccess={async () => {
                const nextType = lastRecordType === 'in' ? 'out' : 'in';
                await onClockAction(nextType);
              }}
              isLoading={actionLoading}
              lastType={lastRecordType}
              isInRange={isInRange}
            />

            {!isInRange && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-center font-bold text-rose-300 bg-rose-500/10 py-3 rounded-2xl border border-rose-500/20"
              >
                Sliding will request an Off-site Log
              </motion.p>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onRefreshLocation}
                disabled={locLoading}
                className="h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
              >
                <LocateFixed className={`w-4 h-4 ${locLoading ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">Refresh GPS</span>
              </button>
              
              <button 
                onClick={() => onRequestCorrection(lastRecordType === 'in' ? 'out' : 'in')}
                className="h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Manual Log</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-[var(--bg-surface)] border-[var(--border)] rounded-[40px] shadow-2xl overflow-hidden relative group">
      {/* Dynamic Background Glow */}
      <div className={`absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 transition-colors duration-1000 ${isClockedIn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      
      <div className="relative p-8 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-[var(--bg-inset)] border border-[var(--border)]">
          <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{dateStr}</span>
        </div>

        <motion.h2 
          key={timeStr}
          initial={{ opacity: 0.5, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-6xl font-black tracking-tighter mb-2 tabular-nums"
        >
          {timeStr}
        </motion.h2>
        
        <div className="flex items-center gap-3 mb-10">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
            isInRange 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}>
            <MapPin className="w-3.5 h-3.5" />
            {isInRange ? 'In Range' : 'Out of Range'}
          </div>
          <div className="px-3 py-1 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest opacity-40">
            {displayDistance}
          </div>
          <button 
            onClick={onRefreshLocation}
            disabled={locLoading || actionLoading}
            className={`w-8 h-8 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg-surface)] transition-all active:scale-90 ${locLoading ? 'animate-spin opacity-40' : ''}`}
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex flex-col items-center gap-6">
          <AnimatePresence mode="wait">
            {isClockedOut ? (
              <motion.div 
                key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 pt-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Shift Completed</p>
              </motion.div>
            ) : (
              <div className="w-full">
                <SlideButton 
                  onSuccess={async () => {
                    const nextType = lastRecordType === 'in' ? 'out' : 'in';
                    await onClockAction(nextType);
                  }}
                  lastType={lastRecordType}
                  isInRange={isInRange}
                  isLoading={actionLoading}
                />
              </div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => onRequestCorrection('in')}
              className="flex items-center gap-2 group/btn"
            >
              <MessageSquare className="w-4 h-4 opacity-20 group-hover/btn:opacity-100 transition-opacity" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30 group-hover/btn:opacity-60">Manual Correction</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
