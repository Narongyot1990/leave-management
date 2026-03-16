'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Briefcase, Send, X, Clock } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<boolean>;
  loading: boolean;
  initialType?: 'in' | 'out';
}

export function CorrectionModal({ isOpen, onClose, onSubmit, loading, initialType = 'in' }: ModalProps) {
  const [type, setType] = useState<'in' | 'out'>(initialType);
  const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;
    const success = await onSubmit({
      type,
      category: 'correction',
      requestedTime: new Date(time),
      reason,
    });
    if (success) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Request Correction</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Attendance Adjustment</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-inset)] transition-colors">
                  <X className="w-5 h-5 opacity-30" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Action Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['in', 'out'] as const).map((t) => (
                      <button 
                        key={t} onClick={() => setType(t)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${
                          type === t 
                            ? (t === 'in' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20')
                            : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'
                        }`}
                      >
                        Clock {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Actual Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      type="datetime-local" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-11 p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Reason / Description</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide a valid reason for this request..."
                    rows={3}
                    className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none transition-all"
                  />
                </div>
              </div>

              <button 
                disabled={loading || !reason}
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {loading ? 'Sending...' : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function OffsiteModal({ isOpen, onClose, onSubmit, loading }: ModalProps) {
  const [type, setType] = useState<'in' | 'out'>('in');
  const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
  const [reason, setReason] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async () => {
    if (!reason || !location) return;
    const success = await onSubmit({
      type,
      category: 'offsite',
      requestedTime: new Date(time),
      reason,
      offsiteLocation: location,
    });
    if (success) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]"
          >
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 border border-violet-500/20">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Off-site Work</h3>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Field Mission Request</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-inset)] transition-colors">
                  <X className="w-5 h-5 opacity-30" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Action Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['in', 'out'] as const).map((t) => (
                      <button 
                        key={t} onClick={() => setType(t)}
                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all ${
                          type === t 
                            ? (t === 'in' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-rose-500 text-white border-rose-500 shadow-lg')
                            : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'
                        }`}
                      >
                        OT-Clock {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Working Location</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where are you working?"
                    className="w-full p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Working Time</label>
                  <input 
                    type="datetime-local" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Mission Details</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly describe your mission..."
                    rows={2}
                    className="w-full p-3.5 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              </div>

              <button 
                disabled={loading || !reason || !location}
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl bg-violet-500 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {loading ? 'Sending...' : (
                  <>
                    <Briefcase className="w-4 h-4" />
                    Submit Mission
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
