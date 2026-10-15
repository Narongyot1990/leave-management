'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { FileText, ClipboardList, CalendarDays, Phone, Clock, ImageIcon } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AdminBranchFilter from '@/components/AdminBranchFilter';
import AdminCardShell from '@/components/AdminCardShell';
import AdminTabChips from '@/components/AdminTabChips';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import ImageViewerModal from '@/components/ImageViewerModal';
import OtMonthlyView from '@/components/OtMonthlyView';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta, getRecordTypeLabel, getStatusBadge } from '@/lib/leave-types';
import { getIncomeClaimTypeMeta } from '@/lib/ot-types';
import { getWorkDurationLabel } from '@/lib/ot-duration';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';
import type { LeaveRequestRecord } from '@/lib/app-types';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminBranchScope } from '@/hooks/useAdminBranchScope';
import { usePusher } from '@/hooks/usePusher';

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

interface EmployeeOption {
  _id: string;
  lineDisplayName?: string;
  name?: string;
  surname?: string;
  employeeId?: string;
  branch?: string;
  role?: string;
}

interface OtRecord {
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
  date: string;
  claimType: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  photoUrl?: string;
  status: string;
  rejectedReason?: string;
  approvedBy?: {
    _id: string;
    name?: string;
    surname?: string;
    lineDisplayName?: string;
    lineProfileImage?: string;
    performanceTier?: string;
  };
}

interface LeavePagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];
const LEAVE_PAGE_SIZE = 25;

function getEmployeeLabel(employee: EmployeeOption) {
  const fullName = employee.name && employee.surname
    ? `${employee.name} ${employee.surname}`
    : employee.lineDisplayName || 'Unknown';
  const employeeId = employee.employeeId ? ` (${employee.employeeId})` : '';
  const branch = employee.branch ? ` - ${employee.branch}` : '';
  return `${fullName}${employeeId}${branch}`;
}

function AdminHistoryContent() {
  const searchParams = useSearchParams();
  const { user } = useAdminSession();
  const role = 'admin' as const;
  
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [substitutes, setSubstitutes] = useState<SubstituteRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [otRequests, setOtRequests] = useState<OtRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [leavePagination, setLeavePagination] = useState<LeavePagination | null>(null);
  const [otPagination, setOtPagination] = useState<LeavePagination | null>(null);
  const [loadingMoreOt, setLoadingMoreOt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMoreLeaves, setLoadingMoreLeaves] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');
  const [otSubView, setOtSubView] = useState('list');
  const [otMonthlyRecords, setOtMonthlyRecords] = useState<OtRecord[]>([]);
  const [otMonthlyLoading, setOtMonthlyLoading] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const { selectedBranch, setSelectedBranch, appendBranchToParams } = useAdminBranchScope();

  const handleBranchSelect = useCallback((branch: string) => {
    setSelectedBranch(branch);
    setSelectedEmployeeId('all');
  }, [setSelectedBranch]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const buildScopedParams = useCallback(() => {
    const params = appendBranchToParams(new URLSearchParams());
    if (selectedEmployeeId !== 'all') {
      params.set('userId', selectedEmployeeId);
    }
    return params;
  }, [appendBranchToParams, selectedEmployeeId]);

  const fetchEmployees = useCallback(async () => {
    if (!user) return;

    const params = appendBranchToParams(new URLSearchParams({ activeOnly: 'true' }));
    const queryString = params.toString();
    const response = await fetch(`/api/users${queryString ? `?${queryString}` : ''}`);
    const data = await response.json();
    if (data.success) {
      const scopedUsers = selectedBranch === 'all'
        ? data.users
        : data.users.filter((employee: EmployeeOption) => employee.branch?.toLowerCase() === selectedBranch.toLowerCase());
      setEmployees(scopedUsers);
    }
  }, [appendBranchToParams, selectedBranch, user]);

  const fetchLeaves = useCallback(async (page = 1, append = false) => {
    const params = buildScopedParams();
    params.set('page', String(page));
    params.set('limit', String(LEAVE_PAGE_SIZE));

    const response = await fetch(`/api/leave?${params.toString()}`);
    const data = await response.json();
    if (data.success) {
      setLeaves((current) => append ? [...current, ...data.requests] : data.requests);
      setLeavePagination(data.pagination);
    }
  }, [buildScopedParams]);

  const fetchOt = useCallback(async (page = 1, append = false) => {
    const params = buildScopedParams();
    params.set('page', String(page));
    params.set('limit', String(LEAVE_PAGE_SIZE));

    const response = await fetch(`/api/ot?${params.toString()}`);
    const data = await response.json();
    if (data.success) {
      setOtRequests((current) => append ? [...current, ...data.requests] : data.requests);
      setOtPagination(data.pagination);
    }
  }, [buildScopedParams]);

  const fetchOtMonthly = useCallback(async () => {
    if (selectedEmployeeId === 'all') {
      setOtMonthlyRecords([]);
      return;
    }
    setOtMonthlyLoading(true);
    try {
      const response = await fetch(`/api/ot?userId=${encodeURIComponent(selectedEmployeeId)}`);
      const data = await response.json();
      if (data.success) {
        setOtMonthlyRecords(data.requests);
      }
    } finally {
      setOtMonthlyLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (activeTab === 'ot' && otSubView === 'monthly') {
      fetchOtMonthly();
    }
  }, [activeTab, otSubView, fetchOtMonthly]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let subUrl = '/api/substitute';

      const queryParams = buildScopedParams();
      const queryString = queryParams.toString();
      if (queryString) {
        subUrl += `?${queryString}`;
      }

      const [substituteRes, attendanceRes] = await Promise.all([
        fetch(subUrl),
        fetch(`/api/attendance?userId=${user.id}`)
      ]);

      const [substituteData, attendanceData] = await Promise.all([
        substituteRes.json(),
        attendanceRes.json()
      ]);

      await Promise.all([fetchLeaves(1, false), fetchOt(1, false)]);
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
  }, [buildScopedParams, fetchLeaves, fetchOt, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleLoadMoreLeaves = useCallback(async () => {
    if (!leavePagination?.hasMore) return;
    setLoadingMoreLeaves(true);
    try {
      await fetchLeaves(leavePagination.page + 1, true);
    } finally {
      setLoadingMoreLeaves(false);
    }
  }, [fetchLeaves, leavePagination]);

  const handleLoadMoreOt = useCallback(async () => {
    if (!otPagination?.hasMore) return;
    setLoadingMoreOt(true);
    try {
      await fetchOt(otPagination.page + 1, true);
    } finally {
      setLoadingMoreOt(false);
    }
  }, [fetchOt, otPagination]);

  const handleLeaveChanged = useCallback(async () => {
    fetchData();
  }, [fetchData]);

  usePusher('leave-requests', [
    { event: 'new-leave-request', callback: handleLeaveChanged },
    { event: 'leave-status-changed', callback: handleLeaveChanged },
    { event: 'leave-cancelled', callback: handleLeaveChanged },
  ], !!user);

  usePusher('ot-requests', [
    { event: 'new-ot-request', callback: handleLeaveChanged },
    { event: 'ot-status-changed', callback: handleLeaveChanged },
    { event: 'ot-cancelled', callback: handleLeaveChanged },
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
                onSelectBranch={handleBranchSelect}
                branchCodes={BRANCHES}
              />
            </motion.div>

            {(activeTab === 'leave' || activeTab === 'ot') && (
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-3">
                <label className="block text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  เลือกพนักงาน
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  className="input w-full"
                >
                  <option value="all">ทุกคน{selectedBranch !== 'all' ? `ในสาขา ${selectedBranch}` : ''}</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {getEmployeeLabel(employee)}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            <AdminTabChips
              activeKey={activeTab}
              onChange={setActiveTab}
              options={[
                { key: 'leave', label: `การลา (${leavePagination?.total ?? leaves.length})` },
                { key: 'ot', label: `รายได้พิเศษ (${otPagination?.total ?? otRequests.length})` },
                { key: 'substitute', label: `ลงแทน (${substitutes.length})` },
                { key: 'attendance', label: `ลงเวลา (${attendance.length})` },
              ]}
            />

            {activeTab === 'ot' && (
              <AdminTabChips
                activeKey={otSubView}
                onChange={setOtSubView}
                options={[
                  { key: 'list', label: 'รายการ' },
                  { key: 'monthly', label: 'รายเดือน' },
                ]}
              />
            )}

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
                                  onClick={() => { setProfileUser(request.approvedBy as ProfileUser); setShowProfile(true); }}
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
                  {leavePagination?.hasMore && (
                    <button
                      type="button"
                      onClick={handleLoadMoreLeaves}
                      disabled={loadingMoreLeaves}
                      className="btn btn-ghost w-full"
                    >
                      {loadingMoreLeaves ? 'กำลังโหลด...' : `โหลดเพิ่ม (${leaves.length}/${leavePagination.total})`}
                    </button>
                  )}
                </div>
              )
            ) : activeTab === 'ot' && otSubView === 'monthly' ? (
              selectedEmployeeId === 'all' ? (
                <AdminEmptyState icon={Clock} message="กรุณาเลือกพนักงานเพื่อดูรายเดือน" />
              ) : (
                <OtMonthlyView records={otMonthlyRecords} onViewPhoto={setViewingPhotoUrl} loading={otMonthlyLoading} />
              )
            ) : activeTab === 'ot' ? (
              otRequests.length === 0 ? (
                <AdminEmptyState icon={Clock} message="ไม่พบประวัติรายได้พิเศษ" />
              ) : (
                <div className="space-y-2">
                  {otRequests.map((request, index) => {
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
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />
                                <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent)' }}>{formatDateThai(request.date)}</span>
                              </div>
                              {(() => {
                                const typeMeta = getIncomeClaimTypeMeta(request.claimType);
                                const TypeIcon = typeMeta.icon;
                                return (
                                  <div className="flex items-center gap-1">
                                    <TypeIcon className="w-3.5 h-3.5" style={{ color: typeMeta.color }} strokeWidth={1.8} />
                                    <span className="text-fluid-xs" style={{ color: typeMeta.color }}>{typeMeta.label}</span>
                                  </div>
                                );
                              })()}
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
                                  onClick={() => { setProfileUser(request.approvedBy as ProfileUser); setShowProfile(true); }}
                                />
                              </div>
                            )}
                          </div>
                          {(() => {
                            const durationLabel = getWorkDurationLabel(request.startTime, request.endTime);
                            return durationLabel ? (
                              <p className="text-fluid-xs mt-1 font-medium" style={{ color: 'var(--accent)' }}>
                                {request.startTime}–{request.endTime} ({durationLabel})
                              </p>
                            ) : null;
                          })()}
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <p className="text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>{request.reason}</p>
                            {request.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingPhotoUrl(request.photoUrl ?? null)}
                                className="btn btn-ghost px-2.5 py-1 min-h-0 text-fluid-xs shrink-0"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                ดูภาพ
                              </button>
                            )}
                          </div>
                          {request.status === 'rejected' && request.rejectedReason && (
                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-[10px] font-bold text-red-500">REASON: {request.rejectedReason}</p>
                            </div>
                          )}
                        </div>
                      </AdminCardShell>
                    );
                  })}
                  {otPagination?.hasMore && (
                    <button
                      type="button"
                      onClick={handleLoadMoreOt}
                      disabled={loadingMoreOt}
                      className="btn btn-ghost w-full"
                    >
                      {loadingMoreOt ? 'กำลังโหลด...' : `โหลดเพิ่ม (${otRequests.length}/${otPagination.total})`}
                    </button>
                  )}
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
      <ImageViewerModal imageUrl={viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} />
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
