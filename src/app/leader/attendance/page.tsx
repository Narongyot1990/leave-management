'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, CheckCircle2, AlertCircle, History as HistoryIcon, Navigation as NavIcon, LocateFixed, Trash2, Building2, ChevronRight, LogOut } from 'lucide-react';
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

export default function AttendancePage() {
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
        // Sort descending
        const sorted = data.records.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecords(sorted);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user, fetchRecords]);

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
      const res = await fetch('/api/attendance', {
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
    if (!confirm('ยืนยันการลบ?')) return;
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ลบพื้นสำเร็จ');
        fetchRecords();
      }
    } catch { /* ignore */ }
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
           <button onClick={() => router.push('/leader/home')} className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center">
              <LogOut className="w-5 h-5 opacity-40 group-hover:opacity-100 rotate-180" />
           </button>
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
               <button onClick={() => warpTo('user')} className="w-11 h-11 rounded-2xl bg-white/60 dark:bg-black/40 shadow-xl backdrop-blur-xl flex items-center justify-center text-[var(--accent)] border border-white/20 transition-transform active:scale-90">
                  <LocateFixed className="w-5 h-5" />
               </button>
               <button onClick={() => warpTo('office')} className="w-11 h-11 rounded-2xl bg-white/60 dark:bg-black/40 shadow-xl backdrop-blur-xl flex items-center justify-center text-amber-500 border border-white/20 transition-transform active:scale-90">
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
               <div className="w-[1px] h-3 bg-white/20" />
               <p className="text-[12px] font-black tracking-tight leading-none opacity-80">
                  {distance !== null ? `${(distance / 1000).toFixed(2)}km` : '---'}
               </p>
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
                       <SlideButton 
                         type={canClockIn ? 'in' : 'out'} 
                         disabled={!isInRange || actionLoading}
                         onSuccess={() => handleClockAction(canClockIn ? 'in' : 'out')}
                         errorMsg={!isInRange ? `Out of Range (${Math.round(distance || 0)}m)` : ''}
                         isClockedIn={isClockedIn}
                       />
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

          {/* New History List - Bottom (Step Progress) */}
          <div className="card p-1">
             <div className="flex items-center justify-between p-3 border-b border-[var(--border)] bg-[var(--bg-inset)] rounded-t-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Personal Timeline (Today)</span>
                <HistoryIcon className="w-3 h-3 opacity-30" />
             </div>
             <div className="max-h-[220px] overflow-y-auto overflow-x-hidden p-4 space-y-0 custom-scrollbar relative">
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
                            <button onClick={() => handleDeleteRecord(rec._id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </main>
      </div>
      <BottomNav role="leader" />
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
      `}</style>
    </div>
  );
}

function SlideButton({ type, disabled, onSuccess, errorMsg, isClockedIn }: any) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState(260);

  useEffect(() => {
    if (containerRef.current) {
      // Calculate max drag distance based on container width
      setMaxWidth(containerRef.current.clientWidth - 56); // handle (48) + padding
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
      // iPhone Spring back animation
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 25 });
    }
    
    // Reset if success or threshold met
    if (!disabled && ((type === 'in' && currentX > threshold) || (type === 'out' && currentX < -threshold))) {
      x.set(0);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div 
        className={`relative w-full h-[60px] rounded-[24px] p-1.5 flex items-center overflow-hidden shadow-2xl backdrop-blur-3xl transition-all
          ${isClockedIn ? 'bg-black/30 border-white/5 shadow-inner' : 'bg-white/10 dark:bg-black/30 border-white/10 dark:border-white/5'}`}
        style={{ border: '1px solid' }}
      >
        <motion.div style={{ opacity }} className="absolute inset-0 flex items-center justify-center font-black text-[10px] uppercase tracking-[0.25em] pointer-events-none text-white drop-shadow-md text-center">
           {errorMsg ? (
             <span className="text-rose-300 leading-tight px-4">{errorMsg}</span>
           ) : (
             <span className="leading-tight pl-2">{label}</span>
           )}
        </motion.div>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <div className={`flex gap-1.5 ${type === 'in' ? 'pl-8' : 'pr-8'}`}>
              {[1,2,3,4].map(i => (
                <ChevronRight key={i} className={`w-3.5 h-3.5 ${type === 'out' ? 'rotate-180' : ''} animate-pulse`} 
                  style={{ animationDelay: `${type === 'in' ? i*150 : (5-i)*150}ms` }} />
              ))}
           </div>
        </div>

        <div className={`flex w-full ${type === 'in' ? 'justify-start' : 'justify-end'}`}>
          <motion.div
            drag="x"
            dragConstraints={type === 'in' ? { left: 0, right: maxWidth } : { left: -maxWidth, right: 0 }}
            dragElastic={0.08}
            onDragEnd={onDragEnd}
            className="w-[48px] h-[48px] rounded-[18px] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-10 border border-white/20 active:scale-95 transition-transform"
            style={{ x, background: bgColor, color: 'white' }}
          >
            {type === 'in' ? <Clock className="w-5 h-5 drop-shadow-sm" /> : <LogOut className="w-5 h-5 drop-shadow-sm rotate-180" />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
