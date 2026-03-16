'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, CheckCircle2, AlertCircle, History as HistoryIcon, Navigation as NavIcon, LocateFixed, Trash2, Building2, ChevronRight, LogOut, MessageSquare, Send, CalendarDays, MapPinned, Briefcase, FileEdit, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';
import { MapHandle } from '@/components/BranchMap';

const BranchMap = dynamic(() => import('@/components/BranchMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-inset animate-pulse rounded-2xl flex items-center justify-center text-xs text-muted">Loading Map...</div>
});

const pad = (n: number) => String(n).padStart(2, '0');

function AttendanceContent() {
  const router = useRouter();
  const { branches } = useBranches();
  const { showToast } = useToast();
  const mapRef = useRef<MapHandle>(null);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [branchRadius, setBranchRadius] = useState(50);
  const [branchLocation, setBranchLocation] = useState<any>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isOffsiteModalOpen, setIsOffsiteModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionTime, setCorrectionTime] = useState(new Date().toISOString().slice(0, 16));
  const [correctionType, setCorrectionType] = useState<'in' | 'out'>('in');
  const [offsiteReason, setOffsiteReason] = useState('');
  const [offsiteLocation, setOffsiteLocation] = useState('');
  const [offsiteTime, setOffsiteTime] = useState(new Date().toISOString().slice(0, 16));
  const [offsiteType, setOffsiteType] = useState<'in' | 'out'>('in');
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [myCorrections, setMyCorrections] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          router.push('/admin/login');
        }
      } catch {
        router.push('/admin/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchRecords = useCallback(async () => {
    if (!user?._id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?date=${today}&userId=${user._id}`);
      const data = await res.json();
      if (data.success) {
        const sorted = data.records.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecords(sorted);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?._id]);

  const fetchMySchedule = useCallback(async () => {
    if (!user?._id) return;
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/work-schedule?userId=${user._id}&month=${month}`);
      const data = await res.json();
      if (data.success && data.schedules?.length > 0) {
        setMySchedule(data.schedules[0].entries || []);
      }
    } catch (err) { console.error(err); }
  }, [user?._id]);

  const fetchMyCorrections = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/correction`);
      const data = await res.json();
      if (data.success) {
        setMyCorrections(data.corrections || []);
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecords();
      fetchMySchedule();
      fetchMyCorrections();
    }
  }, [user, fetchRecords, fetchMySchedule, fetchMyCorrections]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(coords);
        const targetBranchCode = user?.branch || 'AYA';
        const currentBranch = branches.find(b => b.code === targetBranchCode);
        if (currentBranch?.location) {
          const dist = calculateDistance(coords.lat, coords.lon, currentBranch.location.lat, currentBranch.location.lon);
          setDistance(dist);
          setBranchLocation(currentBranch.location);
          setBranchRadius(currentBranch.radius || 50);
        }
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true }
    );
  }, [branches, user]);

  useEffect(() => {
    if (branches.length > 0) updateLocation();
  }, [branches, updateLocation]);

  const handleClockAction = async (type: 'in' | 'out') => {
    setActionLoading(true);
    try {
      const targetBranchCode = user?.branch || 'AYA';
      const currentBranch = branches.find(b => b.code === targetBranchCode);
      const res = await fetch('https://drivers-tau.vercel.app/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          location,
          branchCode: targetBranchCode,
          branchLocation: currentBranch?.location,
          radius: branchRadius
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `บันทึกเวลา${type === 'in' ? 'เข้า' : 'ออก'}สำเร็จ`);
        fetchRecords();
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      showToast('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ลบรายการสำเร็จ');
        fetchRecords();
      } else {
        showToast('error', data.error || 'ไม่สามารถลบได้');
      }
    } catch { showToast('error', 'เกิดข้อผิดพลาด'); }
  };

  const handleRequestCorrection = async () => {
    if (!correctionReason) return showToast('error', 'กรุณาระบุเหตุผล');
    setActionLoading(true);
    try {
      const targetBranchCode = user?.branch || 'AYA';
      const res = await fetch(`/api/attendance/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: correctionType,
          category: 'correction',
          requestedTime: new Date(correctionTime),
          reason: correctionReason,
          location,
          distance,
          branch: targetBranchCode
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ส่งคำขอแก้ไขเวลาแล้ว รอ Admin อนุมัติ');
        setIsCorrectionModalOpen(false);
        setCorrectionReason('');
        fetchMyCorrections();
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      showToast('error', 'ไม่สามารถส่งคำขอได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestOffsite = async () => {
    if (!offsiteReason) return showToast('error', 'กรุณาระบุเหตุผล');
    if (!offsiteLocation) return showToast('error', 'กรุณาระบุสถานที่ปฏิบัติงาน');
    setActionLoading(true);
    try {
      const targetBranchCode = user?.branch || 'AYA';
      const res = await fetch('https://drivers-tau.vercel.app/api/attendance/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: offsiteType,
          category: 'offsite',
          requestedTime: new Date(offsiteTime),
          reason: offsiteReason,
          offsiteLocation,
          location: location || { lat: 0, lon: 0 },
          distance: distance || 0,
          branch: targetBranchCode
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ส่งคำขอทำงานนอกสถานที่แล้ว รอ Admin อนุมัติ');
        setIsOffsiteModalOpen(false);
        setOffsiteReason('');
        setOffsiteLocation('');
        fetchMyCorrections();
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      showToast('error', 'ไม่สามารถส่งคำขอได้');
    } finally {
      setActionLoading(false);
    }
  };

  const isClockedIn = records.some(r => r.type === 'in');
  const isClockedOut = records.some(r => r.type === 'out');
  const canClockIn = !isClockedIn && !isClockedOut;
  const canClockOut = isClockedIn && !isClockedOut;
  const isInRange = distance !== null && distance <= (branchRadius + 5);

  const warpTo = (target: 'user' | 'office') => {
    if (target === 'user' && location) mapRef.current?.flyTo(location.lat, location.lon);
    else if (target === 'office' && branchLocation) mapRef.current?.flyTo(branchLocation.lat, branchLocation.lon);
  };

  const getWorkingTime = () => {
    const inRec = records.find(r => r.type === 'in');
    const outRec = records.find(r => r.type === 'out');
    if (inRec && outRec) {
      const diff = new Date(outRec.timestamp).getTime() - new Date(inRec.timestamp).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours} ชม. ${mins} นาที`;
    }
    if (inRec && !outRec) {
      const diff = new Date().getTime() - new Date(inRec.timestamp).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `กำลังทำงาน (${hours}ช. ${mins}ม.)`;
    }
    return null;
  };

  // Get today's schedule
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedule = mySchedule.find(e => e.date === todayStr);

  // Get upcoming 7-day schedule
  const upcomingSchedule = (() => {
    const days: { date: string; dayLabel: string; entry: any }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const entry = mySchedule.find(e => e.date === ds);
      const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
      days.push({
        date: ds,
        dayLabel: i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : `${dayNames[d.getDay()]} ${d.getDate()}`,
        entry,
      });
    }
    return days;
  })();

  const pendingCorrections = myCorrections.filter(c => c.status === 'pending');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />
      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        
        {/* Compact Header */}
        <header className="px-4 pt-6 pb-2 flex items-center justify-between">
           <div>
              <h1 className="text-2xl font-black tracking-tighter">ลงเวลาเข้างาน</h1>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">GPS Presence Check</p>
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => { setOffsiteType('in'); setOffsiteTime(new Date().toISOString().slice(0, 16)); setIsOffsiteModalOpen(true); }}
                className="h-10 px-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-2 text-violet-500 hover:bg-violet-500/20 transition-all active:scale-95"
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">นอกสถานที่</span>
              </button>
              <button onClick={() => router.push('/leader/home')} className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center">
                <LogOut className="w-5 h-5 opacity-40 group-hover:opacity-100 rotate-180" />
              </button>
           </div>
        </header>

          {/* Map Area - Integrated Controls */}
          <div className="relative w-full h-[300px] rounded-[32px] overflow-hidden border border-[var(--border)] shadow-2xl mt-2 bg-[var(--bg-inset)]">
            {branchLocation && (
              <BranchMap 
                ref={mapRef}
                center={branchLocation}
                radius={branchRadius}
                userLocation={location}
                userProfileImage={user?.lineProfileImage}
                readOnly={true}
              />
            )}
            
            {/* Warp Controls - iPhone Style */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
               <button onClick={() => warpTo('user')} className="w-9 h-9 rounded-2xl bg-white/60 dark:bg-black/40 shadow-xl backdrop-blur-xl flex items-center justify-center text-[var(--accent)] border border-white/20 transition-transform active:scale-90">
                  <LocateFixed className="w-5 h-5" />
               </button>
               <button onClick={() => warpTo('office')} className="w-9 h-9 rounded-2xl bg-white/60 dark:bg-black/40 shadow-xl backdrop-blur-xl flex items-center justify-center text-amber-500 border border-white/20 transition-transform active:scale-90">
                  <Building2 className="w-5 h-5" />
               </button>
            </div>

            {/* Distance Display - Floating Pill */}
            <div className="absolute top-4 left-4 z-[1000] bg-black/40 dark:bg-white/10 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 text-white flex items-center gap-3 shadow-lg">
               <div>
                  <p className="text-[7px] font-black opacity-60 tracking-widest uppercase">Distance</p>
                  <p className="text-[12px] font-black tracking-tight leading-none bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                     {distance !== null ? `${Math.round(distance)}m` : '---'}
                  </p>
                </div>
             </div>

             {/* Integrated Action Area - Floating Bottom */}
            <div className="absolute bottom-4 left-4 right-4 z-[1000] space-y-3">
               <AnimatePresence mode="wait">
                  {canClockIn || canClockOut ? (
                    <div className="space-y-3">
                       {isClockedIn && (
                         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                            <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 flex items-center gap-2 shadow-lg">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                               <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">
                                 Active: {getWorkingTime()}
                               </span>
                            </div>
                         </motion.div>
                       )}
                       
                       {isInRange ? (
                         <SlideButton 
                           type={canClockIn ? 'in' : 'out'} 
                           disabled={actionLoading}
                           onSuccess={() => handleClockAction(canClockIn ? 'in' : 'out')}
                           isClockedIn={isClockedIn}
                         />
                       ) : (
                         <motion.button
                           initial={{ opacity: 0, scale: 0.9 }}
                           animate={{ opacity: 1, scale: 1 }}
                           onClick={() => {
                             setCorrectionType(canClockIn ? 'in' : 'out');
                             setCorrectionTime(new Date().toISOString().slice(0, 16));
                             setIsCorrectionModalOpen(true);
                           }}
                           className="w-full h-[54px] rounded-[24px] bg-amber-500 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-amber-500/30 active:scale-95 transition-transform"
                         >
                           <MessageSquare className="w-4 h-4" />
                           ขอแก้ไขเวลา (Out of Range)
                         </motion.button>
                       )}
                    </div>
                  ) : isClockedOut ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 text-center bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-[28px] border border-white/10 shadow-2xl">
                       <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                       <p className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Shift Completed</p>
                       <p className="text-[9px] font-bold text-white/60 mt-0.5 uppercase tracking-wide">Work Time: {getWorkingTime()}</p>
                    </motion.div>
                  ) : null}
               </AnimatePresence>
            </div>
          </div>

          {/* ========== MY SCHEDULE PLAN (Beautiful card matching actual timestamp style) ========== */}
          <div className="px-4 mt-4">
            <div className="card overflow-hidden">
              <button 
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-inset)] rounded-t-2xl"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">My Schedule Plan</span>
                </div>
                {showSchedule ? <ChevronUp className="w-3.5 h-3.5 opacity-30" /> : <ChevronDown className="w-3.5 h-3.5 opacity-30" />}
              </button>

              <AnimatePresence>
                {showSchedule && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-2">
                      {upcomingSchedule.map((day, i) => {
                        const isToday = i === 0;
                        const actualIn = isToday ? records.find(r => r.type === 'in') : null;
                        const actualOut = isToday ? records.find(r => r.type === 'out') : null;
                        
                        return (
                          <div key={day.date} className={`relative rounded-2xl border transition-all ${isToday ? 'border-[var(--accent)]/30 bg-[var(--accent)]/[0.04] shadow-sm' : 'border-[var(--border)] bg-[var(--bg-surface)]'}`}>
                            <div className="flex items-center gap-3 p-3">
                              {/* Day label */}
                              <div className={`shrink-0 w-14 text-center ${isToday ? '' : ''}`}>
                                <p className={`text-[10px] font-black uppercase tracking-wider ${isToday ? 'text-[var(--accent)]' : 'opacity-40'}`}>{day.dayLabel}</p>
                                {!isToday && <p className="text-[8px] font-bold opacity-20 mt-0.5">{day.date.slice(5)}</p>}
                              </div>

                              {/* Divider */}
                              <div className={`w-px h-8 ${isToday ? 'bg-[var(--accent)]/20' : 'bg-[var(--border)]'}`} />

                              {/* Schedule info */}
                              <div className="flex-1 min-w-0">
                                {day.entry ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {/* Planned shift bracket */}
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border" style={{ borderColor: day.entry.color + '40', background: day.entry.color + '12' }}>
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: day.entry.color }} />
                                      <span className="text-[10px] font-black" style={{ color: day.entry.color }}>{day.entry.shiftName}</span>
                                      <span className="text-[9px] font-bold opacity-60" style={{ color: day.entry.color }}>
                                        {pad(day.entry.startHour)}:{pad(day.entry.startMinute)} - {pad(day.entry.endHour)}:{pad(day.entry.endMinute)}
                                      </span>
                                    </div>

                                    {/* Actual timestamps (today only) */}
                                    {isToday && actualIn && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                          IN {new Date(actualIn.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )}
                                    {isToday && actualOut && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400">
                                          OUT {new Date(actualOut.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold opacity-20 italic">ไม่มีกำหนดการ</span>
                                )}
                              </div>

                              {/* Today indicator */}
                              {isToday && (
                                <div className="shrink-0">
                                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] block animate-pulse shadow-[0_0_6px_var(--accent)]" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ========== PENDING REQUESTS ========== */}
          {pendingCorrections.length > 0 && (
            <div className="px-4 mt-4">
              <div className="card p-3">
                <div className="flex items-center gap-2 mb-3">
                  <FileEdit className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">คำขอที่รอดำเนินการ ({pendingCorrections.length})</span>
                </div>
                <div className="space-y-2">
                  {pendingCorrections.map(c => (
                    <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.category === 'offsite' ? 'bg-violet-500/10 text-violet-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {c.category === 'offsite' ? <Briefcase className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black truncate">
                          {c.category === 'offsite' ? 'ทำงานนอกสถานที่' : 'ขอแก้ไขเวลา'} — Clock {c.type.toUpperCase()}
                        </p>
                        <p className="text-[9px] font-bold opacity-40 truncate">{c.reason}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[8px] font-black uppercase shrink-0">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========== ACTUAL TIMELINE (Today) ========== */}
          <div className="px-4 mt-4">
            <div className="card p-1">
               <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-inset)] rounded-t-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Personal Timeline (Today)</span>
                  <HistoryIcon className="w-3 h-3 opacity-30" />
               </div>
               <div className="max-h-[260px] overflow-y-auto overflow-x-hidden p-4 space-y-0 custom-scrollbar relative">
                  {records.length === 0 ? (
                    <div className="py-8 text-center opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-widest">No Personal Logs</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6">
                      {/* Vertical Step Line */}
                      <div className="absolute left-2.5 top-1 bottom-1 w-[2px] bg-[var(--tm-grid)]" />
                      
                      {records.map((rec, idx) => (
                        <div key={rec._id} className="relative">
                           {/* Step dot */}
                           <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-4 border-[var(--bg-surface)] z-10 
                             ${rec.type === 'in' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                           
                           <div className="flex items-start justify-between group">
                              <div>
                                 <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-black uppercase tracking-tight">
                                      {rec.type === 'in' ? 'Clock In' : 'Clock Out'} 
                                      <span className="ml-2 text-amber-500 opacity-60">@{rec.branch || 'AYA'}</span>
                                    </p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${rec.isInside ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                       {rec.isInside ? 'Verified' : 'Out of Bounds'}
                                    </span>
                                 </div>
                                 <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">
                                   {new Date(rec.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                                 </p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteRecord(rec._id); }} 
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
      </div>
      <BottomNav role="leader" />
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
      
      {/* ========== CORRECTION MODAL ========== */}
      <AnimatePresence>
        {isCorrectionModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCorrectionModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">ขอแก้ไขเวลา</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Correction Request</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">ประเภท</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setCorrectionType('in')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${correctionType === 'in' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'}`}
                      >
                        Clock In
                      </button>
                      <button 
                        onClick={() => setCorrectionType('out')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${correctionType === 'out' ? 'bg-rose-500 text-white border-rose-500 shadow-lg' : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'}`}
                      >
                        Clock Out
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">เวลาที่ต้องการลง</label>
                    <input 
                      type="datetime-local" 
                      value={correctionTime}
                      onChange={(e) => setCorrectionTime(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">เหตุผล / รายละเอียด</label>
                    <textarea 
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="เช่น อยู่นอกพื้นที่พิกัดเนื่องจากช่วยเหลือสาขาอื่น..."
                      rows={3}
                      className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button 
                    onClick={() => setIsCorrectionModalOpen(false)}
                    className="py-4 rounded-2xl bg-[var(--bg-inset)] text-[10px] font-black uppercase tracking-widest opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    disabled={actionLoading}
                    onClick={handleRequestCorrection}
                    className="py-4 rounded-2xl bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                  >
                    {actionLoading ? 'กำลังส่ง...' : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        ส่งคำขอ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========== OFFSITE WORK REQUEST MODAL ========== */}
      <AnimatePresence>
        {isOffsiteModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOffsiteModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">ทำงานนอกสถานที่</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Off-site Work Request</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">ประเภท</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setOffsiteType('in')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${offsiteType === 'in' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'}`}
                      >
                        Clock In (นอกสถานที่)
                      </button>
                      <button 
                        onClick={() => setOffsiteType('out')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${offsiteType === 'out' ? 'bg-rose-500 text-white border-rose-500 shadow-lg' : 'bg-[var(--bg-inset)] border-[var(--border)] opacity-60'}`}
                      >
                        Clock Out (นอกสถานที่)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">เวลาที่ปฏิบัติงาน</label>
                    <input 
                      type="datetime-local" 
                      value={offsiteTime}
                      onChange={(e) => setOffsiteTime(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">สถานที่ปฏิบัติงาน</label>
                    <div className="relative">
                      <MapPinned className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
                      <input 
                        type="text"
                        value={offsiteLocation}
                        onChange={(e) => setOffsiteLocation(e.target.value)}
                        placeholder="เช่น สาขาลาดพร้าว, สำนักงานใหญ่..."
                        className="w-full p-4 pl-11 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">เหตุผล / รายละเอียดงาน</label>
                    <textarea 
                      value={offsiteReason}
                      onChange={(e) => setOffsiteReason(e.target.value)}
                      placeholder="เช่น ไปตรวจสอบสาขา, ประชุมกับลูกค้า, อบรมภายนอก..."
                      rows={3}
                      className="w-full p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button 
                    onClick={() => setIsOffsiteModalOpen(false)}
                    className="py-4 rounded-2xl bg-[var(--bg-inset)] text-[10px] font-black uppercase tracking-widest opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    disabled={actionLoading}
                    onClick={handleRequestOffsite}
                    className="py-4 rounded-2xl bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30"
                  >
                    {actionLoading ? 'กำลังส่ง...' : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        ส่งคำขอ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideButton({ type, disabled, onSuccess, errorMsg, isClockedIn }: any) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState(260);

  useEffect(() => {
    if (containerRef.current) {
      setMaxWidth(containerRef.current.clientWidth - 56);
    }
  }, []);

  const opacity = useTransform(x, [0, type === 'in' ? maxWidth : -maxWidth], [0.2, 1]);
  const bgColor = type === 'in' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
  const label = type === 'in' ? `Slide to Clock In` : `Slide to Clock Out`;

  const onDragEnd = () => {
    const currentX = x.get();
    const threshold = maxWidth * 0.82;
    
    if (type === 'in' && currentX > threshold && !disabled) {
      onSuccess();
    } else if (type === 'out' && currentX < -threshold && !disabled) {
      onSuccess();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 25 });
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div 
        className={`relative max-w-[220px] mx-auto h-[54px] rounded-[24px] p-1.5 flex items-center overflow-hidden transition-all duration-300
          ${isClockedIn 
            ? 'bg-black/40 border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)]' 
            : 'bg-white/10 dark:bg-black/30 border-white/10 dark:border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)]'}`}
        style={{ border: '1px solid', backdropFilter: 'blur(24px)' }}
      >
        <motion.div style={{ opacity }} className="absolute inset-0 flex items-center justify-center font-black text-[9px] uppercase tracking-[0.1em] pointer-events-none text-white/90 drop-shadow-md text-center">
           {errorMsg ? (
             <span className="text-rose-300/90 leading-tight px-4">{errorMsg}</span>
           ) : (
             <span className="leading-tight pl-6">{label}</span>
           )}
        </motion.div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <div className={`flex gap-2 ${type === 'in' ? 'pl-10' : 'pr-10'}`}>
              {[1,2,3].map(i => (
                <ChevronRight key={i} className={`w-3.5 h-3.5 ${type === 'out' ? 'rotate-180' : ''} animate-pulse`} 
                  style={{ animationDelay: `${type === 'in' ? i*200 : (4-i)*200}ms` }} />
              ))}
           </div>
        </div>

        <div className={`flex w-full ${type === 'in' ? 'justify-start' : 'justify-end'}`}>
          <motion.div
            drag="x"
            dragConstraints={type === 'in' ? { left: 0, right: maxWidth } : { left: -maxWidth, right: 0 }}
            dragElastic={0.1}
            onDragEnd={onDragEnd}
            className="w-[42px] h-[42px] rounded-[18px] flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing z-10 border border-white/30 active:scale-90 transition-transform duration-200"
            style={{ x, background: bgColor, color: 'white' }}
          >
            {type === 'in' ? <Clock className="w-4 h-4 drop-shadow-md" /> : <LogOut className="w-4 h-4 drop-shadow-md rotate-180" />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AttendanceContent />
    </Suspense>
  );
}
