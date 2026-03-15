'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Bell, CalendarDays, Inbox, Phone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta } from '@/lib/leave-types';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';

interface LeaveRequest {
  _id: string;
  userId: {
    _id: string;
    lineDisplayName: string;
    lineProfileImage?: string;
    performanceTier?: string;
    name?: string;
    surname?: string;
    employeeId?: string;
    phone?: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function LeaderApprovePage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newRequestAlert, setNewRequestAlert] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          if (data.user.role === 'admin') {
            setSelectedBranch('all');
          } else {
            setSelectedBranch(data.user.branch || 'all');
          }
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

  // Fetch pending requests
  const fetchPending = async () => {
    try {
      let url = '/api/leave?status=pending';
      if (role === 'admin' && selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      } else if (role === 'leader' && user?.branch) {
        url += `&branch=${user.branch}`;
      }
      const response = await fetch(url);
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

  useEffect(() => {
    if (!user) return;
    fetchPending();
  }, [user, role, selectedBranch]);

  const { showToast } = useToast();

  // Pusher realtime — new leave requests auto-refresh
  const handleNewLeave = useCallback((data: { userName?: string }) => {
    setNewRequestAlert(true);
    fetchPending();
    showToast('notification', `คำขอลาใหม่จาก ${data?.userName || 'พนักงาน'}`);
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
    setTimeout(() => setNewRequestAlert(false), 5000);
  }, [showToast, role, selectedBranch]);

  const handleLeaveStatusChanged = useCallback(() => {
    fetchPending();
  }, [role, selectedBranch]);

  usePusher('leave-requests', [
    { event: 'new-leave-request', callback: handleNewLeave },
    { event: 'leave-status-changed', callback: handleLeaveStatusChanged },
    { event: 'leave-cancelled', callback: handleLeaveStatusChanged },
  ], !!user);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    
    if (status === 'rejected') {
      setRejectingId(id);
      setRejectReason('');
      setShowRejectModal(true);
      return;
    }
    
    setActionLoading(id);

    try {
      const response = await fetch(`/api/leave/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, approvedBy: user.id }),
      });

      const data = await response.json();

      if (data.success) {
        setRequests(requests.filter((r) => r._id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!user || !rejectingId || !rejectReason.trim()) {
      return;
    }

    setActionLoading(rejectingId);

    try {
      const response = await fetch(`/api/leave/${rejectingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'rejected', 
          approvedBy: user.id,
          rejectedReason: rejectReason.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRequests(requests.filter((r) => r._id !== rejectingId));
        setShowRejectModal(false);
        setRejectingId(null);
        setRejectReason('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };


  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      {/* New Request Alert */}
      <AnimatePresence>
        {newRequestAlert && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3"
            style={{ background: 'var(--success)', color: 'white' }}
          >
            <Bell className="w-4 h-4" />
            <span className="text-fluid-sm font-semibold">มีคำขอลาใหม่!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader
          title="อนุมัติการลา"
          backHref="/leader/home"
          rightContent={
            <span className="badge badge-accent">{requests.length} รายการ</span>
          }
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Branch Filter for Admin */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {(branchesLoading ? [] : branches).map(b => (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBranch(b.code)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b.code ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b.code}
                  </button>
                ))}
              </motion.div>
            )}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : requests.length === 0 ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-12 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--success-light)' }}>
                  <Inbox className="w-8 h-8" style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-fluid-lg font-semibold" style={{ color: 'var(--text-primary)' }}>ไม่มีรายการรออนุมัติ</p>
                <p className="text-fluid-sm mt-1" style={{ color: 'var(--text-muted)' }}>จะแจ้งเตือนเมื่อมีคำขอใหม่</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {requests.map((request, index) => {
                    const meta = getLeaveTypeMeta(request.leaveType);
                    const Icon = meta.icon;

                    return (
                      <motion.div
                        key={request._id}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card overflow-hidden"
                      >
                        {/* User Info */}
                        <div className="p-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                          <UserAvatar
                            imageUrl={request.userId?.lineProfileImage}
                            displayName={request.userId?.name || request.userId?.lineDisplayName}
                            tier={request.userId?.performanceTier}
                            size="md"
                            onClick={() => { setProfileUser(request.userId as ProfileUser); setShowProfile(true); }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {request.userId?.name && request.userId?.surname
                                  ? `${request.userId.name} ${request.userId.surname}`
                                  : request.userId?.lineDisplayName || 'Unknown'}
                                {request.userId?.employeeId && (
                                  <span className="text-fluid-xs font-normal" style={{ color: 'var(--text-muted)' }}>({request.userId.employeeId})</span>
                                )}
                              </h3>
                              <span className="badge badge-warning shrink-0">รออนุมัติ</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-fluid-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                @{request.userId?.lineDisplayName}
                              </p>
                              {request.userId?.phone && (
                                <a href={`tel:${request.userId.phone}`} className="shrink-0">
                                  <Phone className="w-3.5 h-3.5" style={{ color: '#00C853' }} strokeWidth={2} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Leave Details */}
                        <div className="p-4" style={{ background: 'var(--bg-inset)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.8} />
                            <span className="text-fluid-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>
                            <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>{formatDateThai(request.startDate)} - {formatDateThai(request.endDate)} ({getLeaveDays(request.startDate, request.endDate)} วัน)</span>
                          </div>
                          <p className="text-fluid-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{request.reason}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-3 flex gap-2">
                          <button
                            onClick={() => handleAction(request._id, 'approved')}
                            disabled={actionLoading === request._id}
                            className="btn flex-1 text-fluid-sm font-semibold disabled:opacity-50"
                            style={{ background: 'var(--success)', color: 'white', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
                          >
                            {actionLoading === request._id ? (
                              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                อนุมัติ
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleAction(request._id, 'rejected')}
                            disabled={actionLoading === request._id}
                            className="btn btn-danger flex-1 text-fluid-sm font-semibold disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            ไม่อนุมัติ
                          </button>
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

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-fluid-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>เหตุผลที่ไม่อนุมัติ</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="input resize-none"
                placeholder="กรุณาระบุเหตุผล..."
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary flex-1">
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={actionLoading === rejectingId || !rejectReason.trim()}
                  className="btn btn-danger flex-1"
                >
                  {actionLoading === rejectingId ? 'กำลัง...' : 'ยืนยัน'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      <BottomNav role="leader" />
    </div>
  );
}
