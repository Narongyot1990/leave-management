'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Inbox, CheckCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AdminBranchFilter from '@/components/AdminBranchFilter';
import OtApproveRequestCard, { type OtApproveRequest } from '@/components/OtApproveRequestCard';
import AdminRejectReasonForm from '@/components/AdminRejectReasonForm';
import AdminModalShell from '@/components/AdminModalShell';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminBranchScope } from '@/hooks/useAdminBranchScope';
import { useToast } from '@/components/Toast';

export default function AdminApproveOtPage() {
  const { branches, loading: branchesLoading } = useBranches();
  const { user } = useAdminSession();
  const role = 'admin' as const;
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
  const { selectedBranch, setSelectedBranch, withBranchParam } = useAdminBranchScope();

  const closeRejectModal = useCallback(() => {
    setShowRejectModal(false);
    setRejectingId(null);
    setRejectReason('');
  }, []);

  const openProfile = useCallback((requestUser: OtApproveRequest['userId']) => {
    setProfileUser(requestUser as ProfileUser);
    setShowProfile(true);
  }, []);

  const closeProfile = useCallback(() => {
    setShowProfile(false);
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const url = withBranchParam('/api/ot?status=pending');
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
  }, [withBranchParam]);

  useEffect(() => {
    if (!user) return;
    fetchPending();
  }, [user, fetchPending]);

  const { showToast } = useToast();

  const handleNewOt = useCallback((data: { userName?: string }) => {
    setNewRequestAlert(true);
    fetchPending();
    showToast('notification', `คำขอรายได้พิเศษใหม่จาก ${data?.userName || 'พนักงาน'}`);
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
        setRequests((previous) => previous.filter((request) => request._id !== id));
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
        setRequests((previous) => previous.filter((request) => request._id !== rejectingId));
        closeRejectModal();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!user || requests.length === 0) return;
    if (!window.confirm(`ยืนยันอนุมัติทั้งหมด ${requests.length} รายการ?`)) {
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
            <span className="text-fluid-sm font-semibold">มีคำขอรายได้พิเศษใหม่!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader
          title="อนุมัติรายได้พิเศษ"
          backHref="/admin/home"
          rightContent={
            <span className="badge badge-accent">{requests.length} รายการ</span>
          }
        />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto space-y-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <AdminBranchFilter
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
                branchCodes={(branchesLoading ? [] : branches).map((b) => b.code)}
              />
            </motion.div>

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
                <AdminEmptyState
                  icon={Inbox}
                  message="ไม่มีรายการรออนุมัติ"
                  note="จะแจ้งเตือนเมื่อมีคำขอใหม่"
                />
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
                      onOpenProfile={openProfile}
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
            onClose={closeRejectModal}
            contentClassName="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-4"
          >
            <AdminRejectReasonForm
              rejectReason={rejectReason}
              isSubmitting={actionLoading === rejectingId}
              onRejectReasonChange={setRejectReason}
              onCancel={closeRejectModal}
              onConfirm={handleConfirmReject}
            />
          </AdminModalShell>
        )}
      </AnimatePresence>

      <ProfileModal user={profileUser} open={showProfile} onClose={closeProfile} />
      <BottomNav role={role} />
    </div>
  );
}
