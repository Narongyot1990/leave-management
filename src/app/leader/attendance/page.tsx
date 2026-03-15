'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MapPin, Clock, CheckCircle2, AlertCircle, ChevronRight, History as HistoryIcon, Navigation as NavIcon, LocateFixed, LogOut, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/date-utils';

const BranchMap = dynamic(() => import('@/components/BranchMap'), { 
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-inset animate-pulse rounded-2xl flex items-center justify-center text-xs text-muted">Loading Map...</div>
});

export default function AttendancePage() {
  const router = useRouter();
  const { branches } = useBranches();
  const { showToast } = useToast();
  
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
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?date=${today}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    }
  }, [showToast]);

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  // Haversine on client for UI feedback
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
    if (!navigator.geolocation) {
      showToast('error', 'Browser ของคุณไม่รองรับการระบุตำแหน่ง');
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(coords);
        
        // Find assigned branch or default to AYA if none
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
      (err) => {
        console.error(err);
        showToast('error', 'ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, [branches, showToast]);

  useEffect(() => {
    if (branches.length > 0) {
      updateLocation();
    }
  }, [branches, updateLocation]);

  const handleClockAction = async (type: 'in' | 'out') => {
    const limit = branchRadius + 5;
    if (!location || distance === null) {
      showToast('notification', 'กรุณารอการระบุตำแหน่งปัจจุบัน');
      return;
    }

    if (distance > limit) {
      showToast('error', `คุณอยู่นอกพื้นที่ (ระยะห่าง ${Math.round(distance)}ม.)`);
      return;
    }

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
        showToast('success', `บันทึก ${type === 'in' ? 'ลงเวลาเข้า' : 'ลงเวลาออก'} สำเร็จ`);
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
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) return;
    
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ลบรายการสำเร็จ');
        fetchRecords();
      } else {
        showToast('error', data.error || 'ลบไม่สำเร็จ');
      }
    } catch (err) {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const isClockedIn = records.length > 0 && records[0].type === 'in';
  const isInRange = distance !== null && distance <= (branchRadius + 5);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />
      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ลงเวลาทำงาน" subtitle="บันทึกเวลาเข้า-ออกงานด้วย GPS" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-xl mx-auto space-y-3">
            
            {/* Status Card */}
            <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="card p-4 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="flex flex-col items-center text-center space-y-4">

                {/* Real-time Map Integration */}
                <div className="w-full h-[180px] rounded-2xl overflow-hidden border border-border shadow-inner">
                  {branchLocation && (
                    <BranchMap 
                      center={branchLocation}
                      radius={branchRadius}
                      userLocation={location}
                      userProfileImage={user?.lineProfileImage}
                      readOnly={true}
                    />
                  )}
                </div>

                <div>
                  <h2 className="text-fluid-lg font-black" style={{ color: 'var(--text-primary)' }}>
                    {isInRange ? `คุณอยู่ในพื้นที่สาขา ${user?.branch || '---'}` : 'อยู่นอกพื้นที่บริการ'}
                  </h2>
                  <p className="text-fluid-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {distance !== null ? `ห่างจากจุดศูนย์กลาง: ${Math.round(distance)}ม. (รัศมี ${branchRadius}ม.)` : 'กำลังระบุตำแหน่ง...'}
                  </p>
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

                <div className="grid grid-cols-2 w-full gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Time</p>
                    <p className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Date</p>
                    <p className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-4">
              <button
                disabled={!isInRange || actionLoading || isClockedIn}
                onClick={() => handleClockAction('in')}
                className={`h-20 rounded-2xl flex items-center justify-between px-8 transition-all group relative overflow-hidden ${isClockedIn ? 'opacity-50 grayscale' : ''}`}
                style={{ 
                   background: isInRange ? 'var(--accent)' : 'var(--bg-inset)',
                   color: isInRange ? 'white' : 'var(--text-muted)',
                   boxShadow: isInRange ? '0 10px 30px -10px var(--accent)' : 'none'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black uppercase tracking-widest">Clock In</span>
                    <span className="text-[10px] opacity-70">ลงเวลาเข้างาน</span>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${isInRange ? 'opacity-100' : 'opacity-20'}`} />
              </button>

              <button
                disabled={!isInRange || actionLoading || !isClockedIn}
                onClick={() => handleClockAction('out')}
                className={`h-20 rounded-2xl flex items-center justify-between px-8 transition-all group relative overflow-hidden ${!isClockedIn ? 'opacity-50 grayscale' : ''}`}
                style={{ 
                   background: isInRange && isClockedIn ? 'var(--dark)' : 'var(--bg-inset)',
                   color: isInRange && isClockedIn ? 'white' : 'var(--text-muted)',
                   boxShadow: isInRange && isClockedIn ? '0 10px 30px -10px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black uppercase tracking-widest">Clock Out</span>
                    <span className="text-[10px] opacity-70">ลงเวลาออกงาน</span>
                  </div>
                </div>
                <ChevronRight className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${isInRange && isClockedIn ? 'opacity-100' : 'opacity-20'}`} />
              </button>
            </div>

            {/* History List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>วันนี้ (Today)</h3>
                <div className="h-[1px] flex-1 ml-4 bg-gradient-to-r from-[var(--border)] to-transparent opacity-50" />
              </div>

              <div className="space-y-2">
                {records.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--bg-inset)] rounded-2xl border border-dashed border-[var(--border)]">
                    <HistoryIcon className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>ยังไม่มีบันทึกเวลาของวันนี้</p>
                  </div>
                ) : (
                  records.map((rec) => (
                    <motion.div
                      key={rec._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="card p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          {rec.type === 'in' ? <Clock className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                            {rec.type === 'in' ? 'ลงเวลาเข้า' : 'ลงเวลาออก'}
                          </p>
                          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                            {new Date(rec.timestamp).toLocaleTimeString('th-TH')} น. • {rec.branch}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${rec.isInside ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {rec.isInside ? 'In Area' : 'Outside'}
                         </span>
                         <div className="flex items-center justify-end gap-2 mt-1">
                            <p className="text-[10px] font-bold opacity-50">{Math.round(rec.distance)}m</p>
                            <button 
                              onClick={() => handleDeleteRecord(rec._id)}
                              className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      <BottomNav role="leader" />
    </div>
  );
}
