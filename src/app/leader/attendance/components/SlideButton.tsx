'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { ArrowRight, ArrowLeft, Clock, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';

interface SlideButtonProps {
  onSuccess: () => Promise<void>;
  lastType: 'in' | 'out' | null;
  isInRange: boolean;
  isLoading?: boolean;
}

export default function SlideButton({ onSuccess, lastType, isInRange, isLoading }: SlideButtonProps) {
  const [complete, setComplete] = useState(false);
  const x = useMotionValue(0);
  
  // Decide next action: if last was 'in', next is 'out'. If null or 'out', next is 'in'.
  const isClockIn = lastType === 'out' || lastType === null;
  const isOffsite = !isInRange;
  
  const constraintsRef = useRef(null);
  
  const width = 280; // Total width of container
  const handleSize = 56;
  const slideRange = width - handleSize - 8;

  // For 'in': x goes 0 -> slideRange (positive)
  // For 'out': x goes 0 -> -slideRange (negative)
  const xOutput = isClockIn ? [0, slideRange] : [0, -slideRange];
  const opacity = useTransform(x, isClockIn ? [0, slideRange * 0.5] : [0, -slideRange * 0.5], [1, 0]);
  const scale = useTransform(x, isClockIn ? [0, slideRange] : [0, -slideRange], [1, 1.1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = slideRange * 0.8;
    const offset = isClockIn ? info.offset.x : -info.offset.x;

    if (offset >= threshold) {
      setComplete(true);
      animate(x, isClockIn ? slideRange : -slideRange, { type: 'spring', stiffness: 500, damping: 30 });
      setTimeout(() => {
        onSuccess();
        // Reset after animation
        setTimeout(() => {
          setComplete(false);
          x.set(0);
        }, 1000);
      }, 300);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  return (
    <div className="relative w-full max-w-[320px] mx-auto h-[64px] bg-[var(--bg-inset)] rounded-full p-1 border border-[var(--border)] overflow-hidden shadow-inner" ref={constraintsRef}>
      {/* Background Track Text / Guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div style={{ opacity }} className="flex items-center gap-2">
          {isClockIn ? (
            <>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Slide Right to Clock In</span>
              <ArrowRight className="w-3 h-3 opacity-20 animate-pulse" />
            </>
          ) : (
            <>
              <ArrowLeft className="w-3 h-3 opacity-20 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Slide Left to Clock Out</span>
            </>
          )}
        </motion.div>
      </div>

      {/* Handle */}
      <motion.div
        drag="x"
        dragConstraints={isClockIn ? { left: 0, right: slideRange } : { left: -slideRange, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, left: isClockIn ? 4 : 'auto', right: isClockIn ? 'auto' : 4 }}
        className={`absolute top-1 w-[56px] h-[56px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 shadow-xl transition-colors ${
          complete 
            ? 'bg-emerald-500 text-white' 
            : isClockIn 
              ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' 
              : 'bg-gradient-to-br from-rose-500 to-orange-600 text-white'
        }`}
      >
        {complete ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : isClockIn ? (
          <ArrowRight className="w-6 h-6" />
        ) : (
          <ArrowLeft className="w-6 h-6" />
        )}
      </motion.div>

      {/* Dynamic Progress Fill */}
      <motion.div 
        className={`absolute top-1 bottom-1 rounded-full opacity-20 ${isClockIn ? 'left-1 bg-indigo-500' : 'right-1 bg-rose-500'}`}
        style={{ width: useTransform(x, isClockIn ? [0, slideRange] : [0, -slideRange], [56, width - 8]) }}
      />
    </div>
  );
}
