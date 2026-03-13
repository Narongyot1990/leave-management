'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Send, Check, Calendar } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import DatePickerModal from '@/components/DatePickerModal';
import { LEAVE_TYPE_LIST } from '@/lib/leave-types';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';

interface DriverUser {
  id: string;
  lineDisplayName: string;
  status?: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
}

export default function LeavePage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    if (userData.status === 'pending') {
      setIsPending(true);
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/users?status=active`);
        const data = await response.json();
        if (data.success) {
          const currentUser = data.users.find((u: any) => u._id === userData.id);
          if (currentUser) {
            const updatedUser = {
              ...userData,
              vacationDays: currentUser.vacationDays ?? 10,
              sickDays: currentUser.sickDays ?? 10,
              personalDays: currentUser.personalDays ?? 5,
            };
            setUser(updatedUser);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchUserData();
  }, [router]);

  const { showToast } = useToast();

  // Pusher realtime — leave status changed (approved/rejected)
  const handleLeaveStatus = useCallback(async (data: { status?: string; driverUserId?: string }) => {
    if (!user) return;
    if (data.driverUserId && data.driverUserId !== user.id) return;
    // Smart refresh: re-fetch user quota instead of reloading
    try {
      const response = await fetch(`/api/users?status=active`);
      const json = await response.json();
      if (json.success) {
        const currentUser = json.users.find((u: any) => u._id === user.id);
        if (currentUser) {
          setUser((prev) => prev ? {
            ...prev,
            vacationDays: currentUser.vacationDays ?? 10,
            sickDays: currentUser.sickDays ?? 10,
            personalDays: currentUser.personalDays ?? 5,
          } : prev);
        }
      }
    } catch { /* ignore */ }
    const statusText = data.status === 'approved' ? 'อนุมัติแล้ว' : data.status === 'rejected' ? 'ไม่อนุมัติ' : 'มีการเปลี่ยนแปลง';
    showToast(data.status === 'approved' ? 'success' : 'info', `ใบลาของคุณ${statusText}`);
  }, [user, showToast]);

  usePusher('leave-requests', [
    { event: 'leave-status-changed', callback: handleLeaveStatus },
  ], !!user);

  const handleDateSelect = (range: { from: Date; to: Date }) => {
    setStartDate(dayjs(range.from).format('YYYY-MM-DD'));
    setEndDate(dayjs(range.to).format('YYYY-MM-DD'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!leaveType || !startDate || !endDate || !reason) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          leaveType,
          startDate,
          endDate,
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/leave/history');
        }, 1500);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-neo p-8 text-center max-w-sm w-full"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--warning-light)' }}>
            <AlertCircle className="w-7 h-7" style={{ color: 'var(--warning)' }} />
          </div>
          <h2 className="text-fluid-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>รอการยืนยัน</h2>
          <p className="text-fluid-sm mb-6" style={{ color: 'var(--text-muted)' }}>บัญชีของคุณยังไม่ได้รับการยืนยัน กรุณารอหัวหน้างานอนุมัติก่อนใช้งาน</p>
          <button onClick={() => router.push('/home')} className="btn btn-primary w-full">
            กลับหน้าหลัก
          </button>
        </motion.div>
      </div>
    );
  }

  const getLeaveDaysDisplay = () => {
    if (!startDate || !endDate) return '';
    const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    return `(${days} วัน)`;
  };

  const getDateDisplay = () => {
    if (!startDate || !endDate) return 'เลือกวันที่ลา';
    return `${dayjs(startDate).format('D')} - ${dayjs(endDate).format('D MMM YYYY')} ${getLeaveDaysDisplay()}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="ขอลา" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="card p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>ส่งคำขอสำเร็จ!</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>กำลังไปหน้าประวัติ...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Leave Type Selection */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                ประเภทการลา
              </label>
              <div className="space-y-1.5">
                {LEAVE_TYPE_LIST.map((type) => {
                  const Icon = type.icon;
                  const isSelected = leaveType === type.value;
                  const availableDays = type.daysKey ? user?.[type.daysKey] ?? 0 : null;
                  
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setLeaveType(type.value)}
                      className="w-full min-h-[44px] py-3 px-4 rounded-[var(--radius-md)] text-fluid-sm transition-all flex items-center gap-3"
                      style={{
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-inset)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: type.color }} strokeWidth={1.8} />
                      <span className="flex-1 text-left">{type.label}</span>
                      {availableDays !== null && (
                        <span className="text-xs" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                          ({availableDays} วัน)
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Date Selection */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                วันที่
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full p-4 rounded-[var(--radius-md)] flex items-center gap-3"
                style={{ background: 'var(--bg-inset)' }}
              >
                <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="text-fluid-base" style={{ color: startDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {getDateDisplay()}
                </span>
              </button>
            </motion.div>

            {/* Reason Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card p-5 space-y-4"
            >
              <div>
                <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  เหตุผล
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="ระบุเหตุผลการลา..."
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังส่งคำขอ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    ส่งคำขอลา
                  </span>
                )}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <DatePickerModal
        open={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateSelect}
        initialRange={
          startDate && endDate
            ? { from: new Date(startDate), to: new Date(endDate) }
            : undefined
        }
      />

      <BottomNav role="driver" />
    </div>
  );
}
