'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Bell, Inbox, CheckCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import OtApproveRequestCard, { type OtApproveRequest } from '@/components/OtApproveRequestCard';
import AdminRejectReasonForm from '@/components/AdminRejectReasonForm';
import AdminModalShell from '@/components/AdminModalShell';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import type { AppRole, SessionUser } from '@/lib/app-types';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';

export default function LeaderApproveOtPage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<Extract<AppRole, 'leader' | 'admin'>>('leader');
  const [requests, setRequests] = useState<OtApproveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
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

  const fetchPending = useCallback(async () => {
    try {
      let url = '/api/ot?status=pending';
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
  }, [role, selectedBranch, user]);

  useEffect(() => {
    if (!user) return;
    fetchPending();
  }, [user, fetchPending]);

  const { showToast } = useToast();

  const handleNewOt = useCallback((data: { userName?: string }) => {
    setNewRequestAlert(true);
    fetchPending();
    showToast('notification', `คำขอ OT ใหม่จาก ${data?.userName || 'พนักงาน'}`);
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
    setTimeout(() => setNewRequestAlert(false), 5000);
  }, [fetchPending, showToast]);

  const handleOtStatusChanged = useCallback(() => {
    fetchPending();
  }, [fetchPending]);

  usePusher('ot-requests', [
    { event: 'new-ot-request', callback: handleNewOt },
    { event: 'ot-status-changed', callback: handleOtStatusChanged },
    { event: 'ot-cancelled', callback: handleOtStatusChanged },
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
      const response = await fetch(`/api/ot/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
      const response = await fetch(`/api/ot/${rejectingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejectedReason: rejectReason.trim() }),
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

  const handleApproveAll = async () => {
    if (!user || requests.length === 0) return;
    if (!window.confirm(`ยืนยันอนุมัติ OT ทั้งหมด ${requests.length} รายการ?`)) {
      return;
    }

    setBatchLoading(true);
    try {
      const response = await fetch('/api/ot/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: requests.map((request) => request._id) }),
      });

      const data = await response.json();
      if (data.success) {
        setRequests((previous) => previous.filter((request) => !data.approvedIds.includes(request._id)));
        showToast('success', `อนุมัติแล้ว ${data.approvedIds.length} รายการ`);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'ไม่สามารถอนุมัติทั้งหมดได้');
    } finally {
      setBatchLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

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
            <span className="text-fluid-sm font-semibold">มีคำขอ OT ใหม่!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader
          title="อนุมัติ OT"
          backHref="/leader/home"
          rightContent={
            <span className="badge badge-accent">{requests.length} รายการ</span>
          }
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto space-y-4">
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

            {requests.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={batchLoading}
                className="btn btn-primary w-full text-fluid-sm font-semibold disabled:opacity-50"
              >
                {batchLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" />
                    อนุมัติทั้งหมด ({requests.length})
                  </>
                )}
              </button>
            )}

            {loading ? (
              <AdminLoadingState />
            ) : requests.length === 0 ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <AdminEmptyState icon={Inbox} message="ไม่มีรายการรออนุมัติ" note="จะแจ้งเตือนเมื่อมีคำขอใหม่" />
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {requests.map((request, index) => (
                    <OtApproveRequestCard
                      key={request._id}
                      request={request}
                      index={index}
                      actionLoading={actionLoading}
                      onOpenProfile={(requestUser) => { setProfileUser(requestUser as ProfileUser); setShowProfile(true); }}
                      onApprove={(id) => handleAction(id, 'approved')}
                      onReject={(id) => handleAction(id, 'rejected')}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRejectModal && (
          <AdminModalShell
            onClose={() => setShowRejectModal(false)}
            contentClassName="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-4"
          >
            <AdminRejectReasonForm
              rejectReason={rejectReason}
              isSubmitting={actionLoading === rejectingId}
              onRejectReasonChange={setRejectReason}
              onCancel={() => setShowRejectModal(false)}
              onConfirm={handleConfirmReject}
            />
          </AdminModalShell>
        )}
      </AnimatePresence>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      <BottomNav role="leader" />
    </div>
  );
}
