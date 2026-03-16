'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, MapPin, Inbox, MessageSquare, ChevronLeft, Calendar } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { useBranches } from '@/hooks/useBranches';
import { formatDateThai } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';

interface CorrectionRequest {
  _id: string;
  userId: string;
  userName: string;
  type: 'in' | 'out';
  requestedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  location: { lat: number; lon: number };
  distance: number;
  branch: string;
  createdAt: string;
}

export default function AdminCorrectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user.role === 'admin') {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/correction?status=pending');
      const data = await res.json();
      if (data.success) {
        setRequests(data.corrections);
      }
    } catch {
      showToast('error', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Real-time listener for new correction requests
  usePusher('users', [{ event: 'new-correction-request', callback: fetchRequests }], !!user);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user, fetchRequests]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      setRejectingId(id);
      setRejectReason('');
      setShowRejectModal(true);
      return;
    }

    setActionLoading(id);
    try {
      const res = await fetch('/api/attendance/correction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ดำเนินการเรียบร้อยแล้ว');
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      showToast('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(rejectingId);
    try {
      const res = await fetch('/api/attendance/correction', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rejectingId, status: 'rejected', rejectedReason: rejectReason })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ปฏิเสธคำขอเรียบร้อยแล้ว');
        setRequests(prev => prev.filter(r => r._id !== rejectingId));
        setShowRejectModal(false);
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(r => selectedBranch === 'all' || r.branch === selectedBranch);

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      
      <div className="lg:pl-[240px] flex-1 flex flex-col min-h-0 bg-[var(--bg-inset)]/30">
        <header className="px-4 pt-3 pb-3 border-b border-[var(--border)] bg-[var(--bg-surface)] mt-1 mx-2 rounded-2xl md:mx-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => router.push('/admin/home')} className="w-8 h-8 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center">
                <ChevronLeft className="w-4 h-4" />
             </button>
             <div>
                <h1 className="text-sm font-black tracking-tighter leading-none">อนุมัติแก้ไขเวลา</h1>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mt-0.5">Attendance Correction</p>
             </div>
          </div>
          <div className="badge badge-accent">{filteredRequests.length}</div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
           <div className="max-w-2xl mx-auto space-y-4">
              
              {/* Branch Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 <button 
                   onClick={() => setSelectedBranch('all')}
                   className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--bg-surface)] border border-[var(--border)] opacity-60'}`}
                 >
                   ทุกสาขา
                 </button>
                 {branches.map(b => (
                   <button 
                     key={b.code}
                     onClick={() => setSelectedBranch(b.code)}
                     className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedBranch === b.code ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--bg-surface)] border border-[var(--border)] opacity-60'}`}
                   >
                     {b.code}
                   </button>
                 ))}
              </div>

              {loading ? (
                <div className="py-20 text-center opacity-30 animate-pulse">
                   <Clock className="w-10 h-10 mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Loading Requests...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-20 text-center opacity-30">
                   <Inbox className="w-12 h-12 mx-auto mb-3" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No Pending Requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                   <AnimatePresence mode="popLayout">
                      {filteredRequests.map((req) => (
                        <motion.div 
                          key={req._id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="card bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden"
                        >
                           <div className="p-4 flex items-start gap-4 border-b border-[var(--border)]">
                              <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center text-indigo-500 font-bold">
                                 {req.userName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h3 className="text-sm font-black tracking-tight underline decoration-indigo-500/30">{req.userName}</h3>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${req.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                       Clock {req.type}
                                    </span>
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">@{req.branch}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-black uppercase opacity-20">Requested At</p>
                                 <p className="text-[10px] font-bold">{new Date(req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                           </div>

                           <div className="p-4 bg-[var(--bg-inset)]/50 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">Target Time</p>
                                    <div className="flex items-center gap-2 text-[11px] font-bold">
                                       <Calendar className="w-3 h-3 text-indigo-500" />
                                       {formatDateThai(req.requestedTime)} {new Date(req.requestedTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 </div>
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">Location Info</p>
                                    <div className="flex items-center gap-2 text-[11px] font-bold">
                                       <MapPin className="w-3 h-3 text-amber-500" />
                                       {Math.round(req.distance)}m (นอกพื้นที่)
                                    </div>
                                 </div>
                              </div>

                              <div>
                                 <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1">Reason / Note</p>
                                 <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex gap-2">
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400 mt-0.5" />
                                    <p className="text-[11px] font-bold leading-relaxed">{req.reason}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="p-2 flex gap-2">
                              <button 
                                onClick={() => handleAction(req._id, 'approved')}
                                disabled={actionLoading === req._id}
                                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                {actionLoading === req._id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    อนุมัติแก้ไข
                                  </>
                                )}
                              </button>
                              <button 
                                onClick={() => handleAction(req._id, 'rejected')}
                                disabled={actionLoading === req._id}
                                className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                ไม่อนุมัติ
                              </button>
                           </div>
                        </motion.div>
                      ))}
                   </AnimatePresence>
                </div>
              )}
           </div>
        </main>
      </div>

      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRejectModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] p-6 shadow-2xl border border-[var(--border)]">
                <h3 className="text-lg font-black tracking-tight mb-4">ระบุเหตุผลที่ปฏิเสธ</h3>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="กรุณาระบุเหตุผล เช่น ข้อมูลไม่ชัดเจน..."
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
                <div className="grid grid-cols-2 gap-3 mt-6">
                   <button onClick={() => setShowRejectModal(false)} className="py-4 rounded-2xl bg-[var(--bg-inset)] text-[10px] font-black uppercase tracking-widest opacity-60">ยกเลิก</button>
                   <button onClick={handleConfirmReject} className="py-4 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">ยืนยันการปฏิเสธ</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:hidden">
        <BottomNav role="admin" />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}
