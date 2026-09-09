'use client';

import { Suspense, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { FileText, X, AlertCircle, Clock, ImageIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import AdminTabChips from '@/components/AdminTabChips';
import ImageViewerModal from '@/components/ImageViewerModal';
import { getLeaveTypeMeta, getStatusBadge, LEAVE_TYPE_LIST } from '@/lib/leave-types';
import { formatDateThai } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';
import { useLeaveHistoryController } from '@/app/leave/_hooks/useLeaveHistoryController';
import { useOtHistoryController } from '@/app/ot/_hooks/useOtHistoryController';

type LeaveBalanceKey = 'vacationDays' | 'sickDays' | 'personalDays';

function LeaveHistoryContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'ot' ? 'ot' : 'leave');
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const {
    user,
    requests,
    loading,
    initializing,
    error,
    cancellingId,
    profileUser,
    showProfile,
    setShowProfile,
    refreshHistory,
    cancelRequest,
    openApproverProfile,
  } = useLeaveHistoryController();

  const {
    requests: otRequests,
    loading: otLoading,
    error: otError,
    cancellingId: otCancellingId,
    refreshHistory: refreshOtHistory,
    cancelRequest: cancelOtRequest,
  } = useOtHistoryController();

  const { showToast } = useToast();

  const handleLeaveChanged = useCallback(async () => {
    await refreshHistory();
    showToast('info', 'สถานะใบลามีการอัปเดต');
  }, [refreshHistory, showToast]);

  const handleOtChanged = useCallback(async () => {
    await refreshOtHistory();
    showToast('info', 'สถานะคำขอ OT มีการอัปเดต');
  }, [refreshOtHistory, showToast]);

  usePusher(
    'leave-requests',
    [
      { event: 'leave-status-changed', callback: handleLeaveChanged },
      { event: 'leave-cancelled', callback: handleLeaveChanged },
    ],
    Boolean(user),
  );

  usePusher(
    'ot-requests',
    [
      { event: 'ot-status-changed', callback: handleOtChanged },
      { event: 'ot-cancelled', callback: handleOtChanged },
    ],
    Boolean(user),
  );

  const handleCancelOt = async (otId: string) => {
    if (!window.confirm('ต้องการยกเลิกคำขอ OT นี้ใช่หรือไม่?')) {
      return;
    }

    const ok = await cancelOtRequest(otId);
    if (!ok) {
      showToast('error', 'ไม่สามารถยกเลิกคำขอ OT ได้');
      return;
    }

    showToast('success', 'ยกเลิกคำขอ OT เรียบร้อย');
  };

  const handleCancel = async (leaveId: string) => {
    const request = requests.find((item) => item._id === leaveId);
    const isApproved = request?.status === 'approved';

    const message = isApproved
      ? 'ต้องการยกเลิกใบลาที่อนุมัติแล้วใช่หรือไม่? โควต้าจะถูกคืน'
      : 'ต้องการยกเลิกใบลานี้ใช่หรือไม่?';

    if (!window.confirm(message)) {
      return;
    }

    const ok = await cancelRequest(leaveId);
    if (!ok) {
      showToast('error', 'ไม่สามารถยกเลิกใบลาได้');
      return;
    }

    showToast('success', 'ยกเลิกใบลาเรียบร้อย');
  };

  if (initializing || !user) {
    return null;
  }

  const quotaItems = LEAVE_TYPE_LIST.filter((item) => item.daysKey).map((item) => ({
    icon: item.icon,
    label: item.label,
    value: item.daysKey ? user[item.daysKey as LeaveBalanceKey] ?? 0 : 0,
    color: item.color,
  }));

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ประวัติ" backHref="/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto space-y-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <AdminTabChips
                activeKey={activeTab}
                onChange={setActiveTab}
                options={[
                  { key: 'leave', label: '🍃 ประวัติการลา' },
                  { key: 'ot', label: '⏰ ประวัติ OT' },
                ]}
              />
            </motion.div>

            {activeTab === 'leave' && (
            <>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4">
              <div className="grid grid-cols-3 gap-3">
                {quotaItems.map((item) => (
                  <div key={item.label} className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <item.icon className="w-4 h-4 mx-auto mb-1" style={{ color: item.color }} strokeWidth={1.8} />
                    <p className="text-fluid-lg font-extrabold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: 'var(--bg-inset)' }}>
                              <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={1.8} />
                            </div>
                            <div>
                              <h3 className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {meta.label}
                              </h3>
                              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                                {formatDateThai(String(request.startDate))} - {formatDateThai(String(request.endDate))}
                              </p>
                            </div>
                          </div>

                          {request.approvedBy && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                {request.status === 'approved' ? 'อนุมัติโดย' : 'ตรวจสอบโดย'}
                              </span>
                              <UserAvatar
                                imageUrl={request.approvedBy.lineProfileImage}
                                displayName={request.approvedBy.name || request.approvedBy.lineDisplayName || 'ไม่ทราบชื่อ'}
                                tier={request.approvedBy.performanceTier}
                                size="xs"
                                onClick={() => openApproverProfile({
                                  _id: request.approvedBy?._id || '',
                                  id: request.approvedBy?._id || '',
                                  lineDisplayName: request.approvedBy?.lineDisplayName || 'ไม่ทราบชื่อ',
                                  lineProfileImage: request.approvedBy?.lineProfileImage,
                                  name: request.approvedBy?.name,
                                  surname: request.approvedBy?.surname,
                                  branch: request.approvedBy?.branch,
                                } satisfies ProfileUser)}
                              />
                            </div>
                          )}

                          {!request.approvedBy && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
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
                            {formatDateThai(String(request.createdAt))}
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
            </>
            )}

            {activeTab === 'ot' && (
            <>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-lg font-extrabold" style={{ color: 'var(--success)' }}>
                    {otRequests.filter((r) => r.status === 'approved').length}
                  </p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>อนุมัติแล้ว (วัน)</p>
                </div>
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-lg font-extrabold" style={{ color: 'var(--warning)' }}>
                    {otRequests.filter((r) => r.status === 'pending').length}
                  </p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>รออนุมัติ (วัน)</p>
                </div>
              </div>
            </motion.div>

            {otError && (
              <div
                className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {otError}
              </div>
            )}

            {otLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : otRequests.length === 0 ? (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-12 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--bg-inset)' }}>
                  <Clock className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ยังไม่มีประวัติ OT</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {otRequests.map((request, index) => {
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0" style={{ background: 'var(--bg-inset)' }}>
                              <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                            </div>
                            <div>
                              <h3 className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {formatDateThai(String(request.date))}
                              </h3>
                            </div>
                          </div>

                          {request.approvedBy && (
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                {request.status === 'approved' ? 'อนุมัติโดย' : 'ตรวจสอบโดย'}
                              </span>
                              <UserAvatar
                                imageUrl={request.approvedBy.lineProfileImage}
                                displayName={request.approvedBy.name || request.approvedBy.lineDisplayName || 'ไม่ทราบชื่อ'}
                                tier={request.approvedBy.performanceTier}
                                size="xs"
                                onClick={() => openApproverProfile({
                                  _id: request.approvedBy?._id || '',
                                  id: request.approvedBy?._id || '',
                                  lineDisplayName: request.approvedBy?.lineDisplayName || 'ไม่ทราบชื่อ',
                                  lineProfileImage: request.approvedBy?.lineProfileImage,
                                  name: request.approvedBy?.name,
                                  surname: request.approvedBy?.surname,
                                  branch: request.approvedBy?.branch,
                                } satisfies ProfileUser)}
                              />
                            </div>
                          )}

                          {!request.approvedBy && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
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
                            {formatDateThai(String(request.createdAt))}
                          </p>

                          <div className="flex items-center gap-1.5">
                            {request.photoUrl && (
                              <button
                                onClick={() => setViewingPhotoUrl(request.photoUrl ?? null)}
                                className="btn btn-ghost px-3 py-1.5 min-h-0 text-fluid-xs"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                ดูภาพ
                              </button>
                            )}
                            {request.status === 'pending' && (
                              <button
                                onClick={() => handleCancelOt(request._id)}
                                disabled={otCancellingId === request._id}
                                className="btn btn-ghost px-3 py-1.5 min-h-0 text-fluid-xs"
                                style={{ color: 'var(--danger)' }}
                              >
                                <X className="w-3.5 h-3.5" />
                                {otCancellingId === request._id ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
            </>
            )}
          </div>
        </div>
      </div>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      <ImageViewerModal imageUrl={viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} />
      <BottomNav role="driver" />
    </div>
  );
}

export default function LeaveHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    }>
      <LeaveHistoryContent />
    </Suspense>
  );
}
