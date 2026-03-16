import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';

export function useAttendanceController() {
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
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [myCorrections, setMyCorrections] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // 1s for clock display
    return () => clearInterval(timer);
  }, []);

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
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [router]);

  const fetchRecords = useCallback(async () => {
    if (!user?._id) return;
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      
      const res = await fetch(`/api/attendance?startDate=${startDate}&endDate=${endDate}&userId=${user._id}`);
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
    if (branches.length > 0 && user) updateLocation();
  }, [branches, user, updateLocation]);

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

  const submitCorrection = async (payload: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          location,
          distance,
          branch: user?.branch || 'AYA'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'ส่งคำขอแล้ว รอ Admin อนุมัติ');
        fetchMyCorrections();
        return true;
      } else {
        showToast('error', data.error || 'เกิดข้อผิดพลาด');
        return false;
      }
    } catch {
      showToast('error', 'ไม่สามารถส่งคำขอได้');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const formatDistance = (m: number | null) => {
    if (m === null) return '---';
    return `${(m / 1000).toFixed(1)} km`;
  };

  const isClockedIn = records.length > 0 && records[0].type === 'in';
  const isClockedOut = records.length > 0 && records[0].type === 'out';
  const lastRecordType = records.length > 0 ? records[0].type : 'out';
  const isInRange = distance !== null && distance <= (branchRadius + 5);

  const allEvents = useMemo(() => [
    ...records.map(r => ({ ...r, eventType: 'actual' as const })),
    ...myCorrections
      .filter(c => c.status !== 'approved') // Approved corrections are now reflected in 'records'
      .map(c => ({
        _id: c._id,
        type: c.type,
        timestamp: c.requestedTime,
        branch: c.branch,
        isInside: (c.distance || 0) <= (c.radius || 55),
        distance: c.distance,
        status: c.status,
        category: c.category,
        reason: c.reason,
        eventType: 'correction' as const
      }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [records, myCorrections]);

  const attendancePairs = useMemo(() => {
    const pairs: { in?: any; out?: any; id: string }[] = [];
    const sortedEvents = [...allEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let currentPair: any = null;

    sortedEvents.forEach(evt => {
      if (evt.type === 'in') {
        if (currentPair) pairs.push(currentPair);
        currentPair = { in: evt, id: evt._id };
      } else if (evt.type === 'out') {
        if (currentPair) {
          currentPair.out = evt;
          pairs.push(currentPair);
          currentPair = null;
        } else {
          pairs.push({ out: evt, id: evt._id });
        }
      }
    });
    if (currentPair) pairs.push(currentPair);

    return pairs.reverse(); 
  }, [allEvents]);

  return {
    user,
    loading,
    location,
    distance,
    displayDistance: formatDistance(distance),
    locLoading,
    records,
    myCorrections,
    allEvents,
    attendancePairs,
    lastRecordType,
    actionLoading,
    branchRadius,
    branchLocation,
    mySchedule,
    currentTime,
    isClockedIn,
    isClockedOut,
    isInRange,
    handleClockAction,
    handleDeleteRecord,
    submitCorrection,
    updateLocation,
  };
}
