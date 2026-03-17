'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { FileText, ClipboardList, CalendarDays, Phone, Clock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AdminBranchFilter from '@/components/AdminBranchFilter';
import AdminCardShell from '@/components/AdminCardShell';
import AdminTabChips from '@/components/AdminTabChips';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta, getRecordTypeLabel, getStatusBadge } from '@/lib/leave-types';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminBranchScope } from '@/hooks/useAdminBranchScope';
import { usePusher } from '@/hooks/usePusher';

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
  approvedBy?: {
    _id: string;
    name: string;
    surname: string;
    lineDisplayName: string;
    lineProfileImage?: string;
    performanceTier?: string;
    branch?: string;
    role?: string;
  };
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
}

interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  type: 'in' | 'out';
  timestamp: string;
  branch: string;
  isInside: boolean;
  distance: number;
}

interface SubstituteRecord {
  _id: string;
  userId: {
    lineDisplayName: string;
    lineProfileImage?: string;
    performanceTier?: string;
    name?: string;
    surname?: string;
    employeeId?: string;
    phone?: string;
  };
  recordType: string;
  date: string;
  description?: string;
}

const BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];

function AdminHistoryContent() {
  const searchParams = useSearchParams();
  const { user } = useAdminSession();
  const role = 'admin' as const;
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [substitutes, setSubstitutes] = useState<SubstituteRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leave');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { selectedBranch, setSelectedBranch, appendBranchToParams } = useAdminBranchScope();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let leaveUrl = '/api/leave';
      let subUrl = '/api/substitute';

      const queryParams = appendBranchToParams(new URLSearchParams());
      const queryString = queryParams.toString();
      if (queryString) {
        leaveUrl += `?${queryString}`;
        subUrl += `?${queryString}`;
      }

      const [leaveRes, substituteRes, attendanceRes] = await Promise.all([
        fetch(leaveUrl),
        fetch(subUrl),
        fetch(`/api/attendance?userId=${user.id}`)
      ]);

      const [leaveData, substituteData, attendanceData] = await Promise.all([
        leaveRes.json(),
        substituteRes.json(),
        attendanceRes.json()
      ]);

      if (leaveData.success) {
        setLeaves(leaveData.requests);
      }
      if (substituteData.success) {
        setSubstitutes(substituteData.records);
      }
      if (attendanceData.success) {
        const sorted = attendanceData.records.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAttendance(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appendBranchToParams, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLeaveChanged = useCallback(async () => {
    fetchData();
  }, [fetchData]);

  usePusher('leave-requests', [
    { event: 'new-leave-request', callback: handleLeaveChanged },
    { event: 'leave-status-changed', callback: handleLeaveChanged },
    { event: 'leave-cancelled', callback: handleLeaveChanged },
  ], !!user);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ประวัติทั้งหมด" backHref="/admin/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <AdminBranchFilter
                selectedBranch={selectedBranch}
                onSelectBranch={setSelectedBranch}
                branchCodes={BRANCHES}
              />
            </motion.div>

            <AdminTabChips
              activeKey={activeTab}
              onChange={setActiveTab}
              options={[
                { key: 'leave', label: `การลา (${leaves.length})` },
                { key: 'substitute', label: `ลงแทน (${substitutes.length})` },
                { key: 'attendance', label: `ลงเวลา (${attendance.length})` },
              ]}
            />

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {loading ? (
              <AdminLoadingState />
            ) : activeTab === 'leave' ? (
              leaves.length === 0 ? (
                <AdminEmptyState icon={FileText} message="ไม่พบประวัติการลา" />
              ) : (
                <div className="space-y-2">
                  {leaves.map((request, index) => {
                    const meta = getLeaveTypeMeta(request.leaveType);
                    const Icon = meta.icon;
                    const badge = getStatusBadge(request.status);

                    return (
                      <AdminCardShell
                        key={request._id}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="overflow-hidden"
                      >
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
                              <span className={`badge ${badge.cls} shrink-0`}>{badge.label}</span>
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
                        <div className="p-4" style={{ background: 'var(--bg-inset)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.8} />
                              <span className="text-fluid-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
                            </div>
                            
                            {request.approvedBy && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                                  {request.status === 'approved' ? 'Approved By' : 'Rejected By'}
                                </span>
                                <UserAvatar
                                  imageUrl={request.approvedBy.lineProfileImage}
                                  displayName={request.approvedBy.name || request.approvedBy.lineDisplayName}
                                  tier={request.approvedBy.performanceTier}
                                  size="xs"
                                  onClick={() => { setProfileUser(request.approvedBy as any); setShowProfile(true); }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>
                            <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
                            <span>{formatDateThai(request.startDate)} - {formatDateThai(request.endDate)} ({getLeaveDays(request.startDate, request.endDate)} วัน)</span>
                          </div>
                          <p className="text-fluid-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{request.reason}</p>
                          {request.status === 'rejected' && request.rejectedReason && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-[10px] font-bold text-red-500">REASON: {request.rejectedReason}</p>
                            </div>
                          )}
                        </div>
                      </AdminCardShell>
                    );
                  })}
                </div>
              )
            ) : activeTab === 'substitute' ? (
              substitutes.length === 0 ? (
                <AdminEmptyState icon={ClipboardList} message="ไม่พบประวัติลงแทน" />
              ) : (
                <div className="space-y-2">
                  {substitutes.map((record, index) => (
                    <AdminCardShell
                      key={record._id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <UserAvatar
                          imageUrl={record.userId?.lineProfileImage}
                          displayName={record.userId?.name || record.userId?.lineDisplayName}
                          tier={record.userId?.performanceTier}
                          size="md"
                          onClick={() => { setProfileUser(record.userId as unknown as ProfileUser); setShowProfile(true); }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {record.userId?.name && record.userId?.surname
                                ? `${record.userId.name} ${record.userId.surname}`
                                : record.userId?.lineDisplayName || 'Unknown'}
                              {record.userId?.employeeId && (
                                <span className="text-fluid-xs font-normal" style={{ color: 'var(--text-muted)' }}>({record.userId.employeeId})</span>
                              )}
                            </h3>
                             <span className="badge badge-warning shrink-0">บันทึกแทน</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-fluid-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              @{record.userId?.lineDisplayName}
                            </p>
                            {record.userId?.phone && (
                              <a href={`tel:${record.userId.phone}`} className="shrink-0">
                                <Phone className="w-3.5 h-3.5" style={{ color: '#00C853' }} strokeWidth={2} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4" style={{ background: 'var(--bg-inset)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList className="w-4 h-4" style={{ color: 'var(--warning)' }} strokeWidth={1.8} />
                          <span className="text-fluid-sm font-medium" style={{ color: 'var(--text-primary)' }}>{getRecordTypeLabel(record.recordType)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>
                          <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>{formatDateThai(record.date)}</span>
                        </div>
                        {record.description && (
                          <p className="text-fluid-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{record.description}</p>
                        )}
                      </div>
                    </AdminCardShell>
                  ))}
                </div>
              )
            ) : activeTab === 'attendance' ? (
              attendance.length === 0 ? (
                <AdminEmptyState icon={Clock} message="ไม่พบประวัติลงเวลา" />
              ) : (
                <div className="space-y-4">
                  {attendance.map((rec, index) => (
                    <AdminCardShell
                      key={rec._id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-10 rounded-full ${rec.type === 'in' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight">
                              Clock {rec.type === 'in' ? 'In' : 'Out'}
                              <span className="ml-2 text-indigo-500">@{rec.branch}</span>
                            </p>
                            <p className="text-[9px] font-bold opacity-40 uppercase mt-0.5">
                              {formatDateThai(rec.timestamp)} • {new Date(rec.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${rec.isInside ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {rec.isInside ? 'Verified' : 'Out of Bounds'}
                          </span>
                          {rec.distance > 0 && (
                             <p className="text-[8px] font-bold opacity-30 mt-1 uppercase tracking-tighter">Dist: {Math.round(rec.distance)}m</p>
                          )}
                        </div>
                      </div>
                    </AdminCardShell>
                  ))}
                </div>
              )
            ) : null}
            </div>
          </div>
        </div>
      </div>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      <BottomNav role={role} />
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <AdminLoadingState className="py-0" />
    </div>
  );
}

export default function AdminHistoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminHistoryContent />
    </Suspense>
  );
}
