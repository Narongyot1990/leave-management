'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, XCircle, Clock, MapPin, Inbox, MessageSquare, 
  ChevronLeft, Calendar, Briefcase, MapPinned, Search, Filter,
  Trash2, Edit, Save, X, LayoutDashboard, History, MoreVertical,
  ArrowRight, Users, Trash, Check, AlertCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/components/Toast';
import { useBranches } from '@/hooks/useBranches';
import { formatDateThai } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';

interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  type: 'in' | 'out';
  branch: string;
  location: { lat: number; lon: number };
  distance: number;
  isInside: boolean;
  timestamp: string;
}

interface CorrectionRequest {
  _id: string;
  userId: string;
  userName: string;
  type: 'in' | 'out';
  category?: 'correction' | 'offsite';
  requestedTime: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  location: { lat: number; lon: number };
  distance: number;
  branch: string;
  offsiteLocation?: string;
  createdAt: string;
}

export default function AdminCorrectionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [user, setUser] = useState<any>(null);
  
  // Tabs & Lists
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Filters
  const [searchName, setSearchName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

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
    if (activeTab !== 'pending') return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/correction?status=pending');
      const data = await res.json();
      if (data.success) {
        setRequests(data.corrections);
      }
    } catch {
      showToast('error', 'ไม่สามารถโหลดข้อมูลคำขอได้');
    } finally {
      setLoading(false);
    }
  }, [showToast, activeTab]);

  const fetchAllRecords = useCallback(async () => {
    if (activeTab !== 'all') return;
    setLoading(true);
    try {
      let url = '/api/attendance?';
      if (searchName) url += `userName=${searchName}&`; // Note: API might need update for partial name search, but let's assume it works or we filter client-side
      if (selectedBranch !== 'all') url += `branch=${selectedBranch}&`;
      if (startDate) url += `startDate=${startDate}T00:00:00Z&`;
      if (endDate) url += `endDate=${endDate}T23:59:59Z&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAllRecords(data.records);
      }
    } catch {
      showToast('error', 'ไม่สามารถโหลดประวัติได้');
    } finally {
      setLoading(false);
    }
  }, [showToast, activeTab, selectedBranch, startDate, endDate]);

  // Real-time listener
  usePusher('users', [{ event: 'new-correction-request', callback: fetchRequests }], !!user);
  usePusher('users', [{ event: 'leader-attendance', callback: fetchAllRecords }], !!user && activeTab === 'all');

  useEffect(() => {
    if (user) {
      if (activeTab === 'pending') fetchRequests();
      else fetchAllRecords();
    }
  }, [user, activeTab, fetchRequests, fetchAllRecords]);

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

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('ยืนยันการลบประวัตินี้? ข้อมูลจะถูกลบถาวร')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'ลบข้อมูลเรียบร้อยแล้ว');
        setAllRecords(prev => prev.filter(r => r._id !== id));
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการลบ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;
    setActionLoading(editingRecord._id);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord._id,
          timestamp: editingRecord.timestamp,
          type: editingRecord.type,
          branch: editingRecord.branch
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'แก้ไขข้อมูลเรียบร้อยแล้ว');
        setAllRecords(prev => prev.map(r => r._id === editingRecord._id ? { ...r, ...editingRecord } : r));
        setEditingRecord(null);
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(r => selectedBranch === 'all' || r.branch === selectedBranch);
  
  // Client-side mapping for search Name in "All" tab if API doesn't support it well
  const filteredAllRecords = allRecords.filter(r => {
    const matchName = r.userName.toLowerCase().includes(searchName.toLowerCase());
    return matchName;
  });

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />
      
      <div className="lg:pl-[240px] flex-1 flex flex-col min-h-0 bg-[var(--bg-inset)]/30">
        {/* Superior Header */}
        <header className="px-6 py-6 border-b border-[var(--border)] bg-[var(--bg-surface)] mt-2 mx-4 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <LayoutDashboard className="w-6 h-6 text-indigo-500" />
             </div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-none uppercase">Attendance Manager</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mt-1">Management Command Center</p>
             </div>
          </div>

          <div className="flex bg-[var(--bg-inset)] p-1.5 rounded-2xl border border-[var(--border)]">
             <button 
               onClick={() => setActiveTab('pending')}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-sm border border-[var(--border)]' : 'opacity-40 hover:opacity-100'}`}
             >
                <AlertCircle className="w-3.5 h-3.5" />
                Pending ({requests.length})
             </button>
             <button 
               onClick={() => setActiveTab('all')}
               className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-sm border border-[var(--border)]' : 'opacity-40 hover:opacity-100'}`}
             >
                <History className="w-3.5 h-3.5" />
                All Records
             </button>
          </div>
        </header>

        {/* Global Filter Bar */}
        <div className="px-4 py-4 md:px-6">
           <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[24px] p-4 flex flex-wrap items-center gap-4 shadow-sm">
             <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อพนักงาน..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:opacity-30"
                />
             </div>

             <div className="flex items-center gap-2 min-w-[140px]">
                <Filter className="w-3.5 h-3.5 opacity-20" />
                <select 
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
                >
                  <option value="all">ทุกสาขา</option>
                  {branches.map(b => (
                    <option key={b.code} value={b.code}>{b.code}</option>
                  ))}
                </select>
             </div>

             {activeTab === 'all' && (
               <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)]">
                     <Calendar className="w-3.5 h-3.5 opacity-20" />
                     <input 
                       type="date" 
                       value={startDate} 
                       onChange={(e) => setStartDate(e.target.value)}
                       className="bg-transparent text-[10px] font-black uppercase tracking-tighter"
                     />
                     <span className="opacity-20">to</span>
                     <input 
                       type="date" 
                       value={endDate}
                       onChange={(e) => setEndDate(e.target.value)}
                       className="bg-transparent text-[10px] font-black uppercase tracking-tighter"
                     />
                  </div>
                  {(startDate || endDate || searchName) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); setSearchName(''); setSelectedBranch('all'); }}
                      className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
               </div>
             )}
           </div>
        </div>

        <main className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 md:px-6">
           <div className="max-w-4xl mx-auto pb-20">
              
              {loading ? (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Fetching Records...</p>
                </div>
              ) : activeTab === 'pending' ? (
                /* PENDING REQUEST FLOW */
                <div className="space-y-4">
                  {filteredRequests.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                       <Inbox className="w-16 h-16" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Everything is up to date</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredRequests.map((req) => (
                        <motion.div 
                          key={req._id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
                        >
                           <div className="p-6 flex items-start gap-5 border-b border-[var(--border)]">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${req.category === 'offsite' ? 'bg-violet-500/10 text-violet-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                 {req.category === 'offsite' ? <Briefcase className="w-7 h-7" /> : req.userName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h3 className="text-lg font-black tracking-tight">{req.userName}</h3>
                                 <div className="flex items-center gap-3 mt-1.5">
                                    {req.category === 'offsite' && (
                                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/10">Off-site</span>
                                    )}
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${req.type === 'in' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/10'}`}>
                                       Clock {req.type}
                                    </span>
                                    <span className="text-[9px] font-black uppercase opacity-20 tracking-tighter">Request #{req._id.slice(-6)}</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black uppercase opacity-20 mb-1">Requested At</p>
                                 <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)] text-[10px] font-black">
                                    {new Date(req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                 </div>
                              </div>
                           </div>

                           <div className="p-6 bg-[var(--bg-inset)]/40 flex flex-col md:flex-row gap-6">
                              <div className="flex-1 space-y-4">
                                 <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)]">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">Correction Target</p>
                                    <div className="flex items-center gap-3 text-sm font-black text-indigo-500">
                                       <Calendar className="w-5 h-5 opacity-40" />
                                       {formatDateThai(req.requestedTime)} | {new Date(req.requestedTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 </div>

                                 <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)]">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-2">Reason</p>
                                    <div className="flex items-start gap-3">
                                       <MessageSquare className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                       <p className="text-xs font-bold leading-relaxed">{req.reason}</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="w-full md:w-[280px] space-y-3">
                                 <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mb-3">{req.category === 'offsite' ? 'Off-site Destination' : 'Detection Details'}</p>
                                    <div className="flex items-center gap-3">
                                       {req.category === 'offsite' ? (
                                         <>
                                           <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500"><MapPinned className="w-5 h-5" /></div>
                                           <span className="text-[12px] font-black tracking-tight">{req.offsiteLocation || 'Not Specified'}</span>
                                         </>
                                       ) : (
                                         <>
                                           <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><MapPin className="w-5 h-5" /></div>
                                           <div>
                                              <span className="text-[12px] font-black block tracking-tight">Out of Range</span>
                                              <span className="text-[10px] font-bold opacity-30">{Math.round(req.distance)}m away from {req.branch}</span>
                                           </div>
                                         </>
                                       )}
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                    <button 
                                      onClick={() => handleAction(req._id, 'approved')}
                                      disabled={actionLoading === req._id}
                                      className="h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center gap-2 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                    >
                                       <CheckCircle2 className="w-4 h-4" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Approve</span>
                                    </button>
                                    <button 
                                      onClick={() => handleAction(req._id, 'rejected')}
                                      disabled={actionLoading === req._id}
                                      className="h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center gap-2 hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                    >
                                       <XCircle className="w-4 h-4" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Reject</span>
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              ) : (
                /* ALL RECORDS TAB */
                <div className="space-y-4">
                  {filteredAllRecords.length === 0 ? (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                       <Clock className="w-16 h-16" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No historical data matches your filters</p>
                    </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <AnimatePresence mode="popLayout">
                         {filteredAllRecords.map((rec) => (
                           <motion.div 
                             key={rec._id}
                             layout
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[28px] p-5 shadow-sm hover:shadow-md transition-all group"
                           >
                             <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold">
                                   {rec.userName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <h4 className="text-sm font-black truncate">{rec.userName}</h4>
                                   <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                         Clock {rec.type}
                                      </span>
                                      <span className="text-[8px] font-black uppercase opacity-20">@{rec.branch}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => setEditingRecord(JSON.parse(JSON.stringify(rec)))}
                                     className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all"
                                   >
                                      <Edit className="w-3.5 h-3.5" />
                                   </button>
                                   <button 
                                     onClick={() => handleDeleteRecord(rec._id)}
                                     className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                </div>
                             </div>

                             <div className="bg-[var(--bg-inset)]/30 rounded-2xl p-4 flex items-center justify-between border border-[var(--border)]/50">
                                <div className="flex items-center gap-3">
                                   <Clock className="w-4 h-4 text-indigo-400 opacity-40" />
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black uppercase opacity-20 tracking-widest">TimeStamp</span>
                                      <span className="text-xs font-black tabular-nums">{new Date(rec.timestamp).toLocaleTimeString('th-TH')}</span>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <span className="text-[10px] font-black uppercase opacity-20 block tracking-widest">Date</span>
                                   <span className="text-[10px] font-bold">{new Date(rec.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                </div>
                             </div>
                           </motion.div>
                         ))}
                       </AnimatePresence>
                     </div>
                  )}
                </div>
              )}
           </div>
        </main>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRejectModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] p-8 shadow-2xl border border-[var(--border)]">
                <h3 className="text-xl font-black tracking-tight mb-2">ปฏิเสธคำขอ</h3>
                <p className="text-xs font-bold opacity-40 mb-6 uppercase tracking-widest">ระบุเหตุผลในการไม่อนุมัติ</p>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="เช่น ข้อมูลเวลาไม่ชัดเจน หรือ ขาดหลักฐาน..."
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-all"
                />
                <div className="grid grid-cols-2 gap-4 mt-8">
                   <button onClick={() => setShowRejectModal(false)} className="h-14 rounded-2xl bg-[var(--bg-inset)] text-[11px] font-black uppercase tracking-widest opacity-60">ยกเลิก</button>
                   <button onClick={handleConfirmReject} className="h-14 rounded-2xl bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95">ยืนยันการปฏิเสธ</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL FOR ALL RECORDS */}
      <AnimatePresence>
         {editingRecord && (
           <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingRecord(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-[440px] bg-[var(--bg-surface)] rounded-[40px] p-10 shadow-3xl border border-[var(--border)]">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Edit className="w-6 h-6" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black tracking-tight uppercase">Edit Record</h3>
                          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{editingRecord.userName}</p>
                       </div>
                    </div>
                    <button onClick={() => setEditingRecord(null)} className="p-3 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] hover:bg-rose-500/10 hover:text-rose-500 transition-all opacity-40 hover:opacity-100">
                       <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="space-y-6">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-2 block">Timestamp (Date & Time)</label>
                       <input 
                         type="datetime-local" 
                         value={new Date(editingRecord.timestamp).toISOString().slice(0, 16)}
                         onChange={(e) => setEditingRecord({ ...editingRecord, timestamp: e.target.value })}
                         className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-2 block">Type</label>
                          <select 
                            value={editingRecord.type}
                            onChange={(e) => setEditingRecord({ ...editingRecord, type: e.target.value as any })}
                            className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                             <option value="in">Clock IN</option>
                             <option value="out">Clock OUT</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-2 block">Branch Scope</label>
                          <select 
                            value={editingRecord.branch}
                            onChange={(e) => setEditingRecord({ ...editingRecord, branch: e.target.value })}
                            className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                          >
                             {branches.map(b => (
                               <option key={b.code} value={b.code}>{b.code}</option>
                             ))}
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 mt-10 pt-8 border-t border-[var(--border)]">
                    <button 
                      onClick={() => setEditingRecord(null)}
                      className="flex-1 h-16 rounded-2xl text-[12px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                      onClick={handleUpdateRecord}
                      disabled={actionLoading === editingRecord._id}
                      className="flex-[2] h-16 rounded-3xl bg-indigo-500 text-white flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/30 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                       {actionLoading === editingRecord._id ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                         <>
                            <Save className="w-5 h-5" />
                            <span className="text-[12px] font-black uppercase tracking-widest">Save Changes</span>
                         </>
                       )}
                    </button>
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
