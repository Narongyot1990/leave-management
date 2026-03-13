'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FileText, X, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { getLeaveTypeMeta, getStatusBadge, LEAVE_TYPE_LIST } from '@/lib/leave-types';
import { formatDateThai } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';

interface LeaveRequest {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  rejectedReason?: string;
  createdAt: string;
}

interface DriverUser {
  id: string;
  lineDisplayName: string;
  vacationDays: number;
  sickDays: number;
  personalDays: number;
}


export default function LeaveHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/leave?userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setRequests(data.requests);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const { showToast } = useToast();

  // Pusher realtime — leave status changes
  const handleLeaveChanged = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/leave?userId=${user.id}`);
      const data = await response.json();
      if (data.success) setRequests(data.requests);
    } catch { /* ignore */ }
    showToast('info', 'สถานะใบลามีการอัปเดต');
  }, [user, showToast]);

  usePusher('leave-requests', [
    { event: 'leave-status-changed', callback: handleLeaveChanged },
    { event: 'leave-cancelled', callback: handleLeaveChanged },
  ], !!user);

  const handleCancel = async (leaveId: string) => {
    const request = requests.find(r => r._id === leaveId);
    const isApproved = request?.status === 'approved';
    
    const message = isApproved 
      ? 'คุณต้องการยกเลิกคำขอลานี้หรือไม่?\n\nหมายเหตุ: วันลาที่ใช้ไปจะถูกคืนกลับมา'
      : 'คุณต้องการยกเลิกคำขอลานี้หรือไม่?';
    
    if (!confirm(message)) {
      return;
    }

    setCancellingId(leaveId);

    try {
      const response = await fetch(`/api/leave/${leaveId}?userId=${user?.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        if (isApproved) {
          const updatedUser = {
            ...user!,
            vacationDays: data.remainingQuota?.vacationDays ?? user!.vacationDays,
            sickDays: data.remainingQuota?.sickDays ?? user!.sickDays,
            personalDays: data.remainingQuota?.personalDays ?? user!.personalDays,
          };
          setUser(updatedUser);
          localStorage.setItem('driverUser', JSON.stringify(updatedUser));
        }
        setRequests(requests.filter(r => r._id !== leaveId));
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผลาพ');
    } finally {
      setCancellingId(null);
    }
  };


  if (!user) {
    return null;
  }

  const quotaItems = [
    ...LEAVE_TYPE_LIST.filter(lt => lt.daysKey).map(lt => ({
      icon: lt.icon,
      label: lt.label.replace('ลา', ''),
      value: lt.daysKey ? (user as any)[lt.daysKey] ?? 0 : 0,
      color: lt.color,
    })),
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="ประวัติการลา" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Quota */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4">
              <div className="grid grid-cols-3 gap-3">
                {quotaItems.map((q) => (
                  <div key={q.label} className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <q.icon className="w-4 h-4 mx-auto mb-1" style={{ color: q.color }} strokeWidth={1.8} />
                    <p className="text-fluid-2xl font-extrabold" style={{ color: q.color }}>{q.value}</p>
                    <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{q.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Content */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : requests.length === 0 ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-12 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-inset)' }}>
                  <FileText className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ยังไม่มีประวัติการลา</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {requests.map((request, index) => {
                    const meta = getLeaveTypeMeta(request.leaveType);
                    const Icon = meta.icon;
                    const iconColor = meta.color;
                    const badge = getStatusBadge(request.status);

                    return (
                      <motion.div
                        key={request._id}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="card p-4"
                      >
                        <div className="flex items-start justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: 'var(--bg-inset)' }}>
                              <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={1.8} />
                            </div>
                            <div>
                              <h3 className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {meta.label}
                              </h3>
                              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatDateThai(request.startDate)} - {formatDateThai(request.endDate)}
                              </p>
                            </div>
                          </div>
                          <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        </div>

                        <p className="text-fluid-xs rounded-[var(--radius-sm)] p-2.5" style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                          {request.reason}
                        </p>

                        {request.status === 'rejected' && request.rejectedReason && (
                          <div className="mt-2 p-2.5 rounded-[var(--radius-sm)] flex items-start gap-2" style={{ background: 'var(--danger-light)' }}>
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                            <div>
                              <p className="text-fluid-xs font-medium" style={{ color: 'var(--danger)' }}>เหตุผล: {request.rejectedReason}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2.5">
                          <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDateThai(request.createdAt)}
                          </p>

                          {(request.status === 'pending' || request.status === 'approved') && (
                            <button
                              onClick={() => handleCancel(request._id)}
                              disabled={cancellingId === request._id}
                              className="btn btn-ghost px-3 py-1.5 min-h-0 text-fluid-xs"
                              style={{ color: 'var(--danger)' }}
                            >
                              <X className="w-3.5 h-3.5" />
                              {cancellingId === request._id ? 'กำลังยกเลิก...' : 'ยกเลิก'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}



