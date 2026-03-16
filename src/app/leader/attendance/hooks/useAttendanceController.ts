'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

  const isClockedIn = records.some(r => r.type === 'in');
  const isClockedOut = records.some(r => r.type === 'out');
  const isInRange = distance !== null && distance <= (branchRadius + 5);

  return {
    user,
    loading,
    location,
    distance,
    locLoading,
    records,
    actionLoading,
    branchRadius,
    branchLocation,
    mySchedule,
    myCorrections,
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
