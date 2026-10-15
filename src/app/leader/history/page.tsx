'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, ClipboardList, CalendarDays, Phone, Clock, ImageIcon, Download } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import AdminTabChips from '@/components/AdminTabChips';
import { AdminEmptyState, AdminLoadingState } from '@/components/AdminPageStates';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import ImageViewerModal from '@/components/ImageViewerModal';
import OtMonthlyView from '@/components/OtMonthlyView';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta, getRecordTypeLabel, getStatusBadge } from '@/lib/leave-types';
import { getIncomeClaimTypeMeta } from '@/lib/ot-types';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';
import { exportLeaveHistoryCsv, exportOtHistoryCsv } from '@/lib/history-export';
import type { AppRole, LeaveRequestRecord, SessionUser } from '@/lib/app-types';
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
    branch?: string;
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
  approvedAt?: string;
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

function LeaderHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<Extract<AppRole, 'leader' | 'admin'>>('leader');
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [substitutes, setSubstitutes] = useState<SubstituteRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [otRequests, setOtRequests] = useState<OtRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [leavePagination, setLeavePagination] = useState<LeavePagination | null>(null);
  const [otPagination, setOtPagination] = useState<LeavePagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMoreLeaves, setLoadingMoreLeaves] = useState(false);
  const [loadingMoreOt, setLoadingMoreOt] = useState(false);
  const [activeTab, setActiveTab] = useState('leave');
  const [otSubView, setOtSubView] = useState('list');
  const [otMonthlyRecords, setOtMonthlyRecords] = useState<OtRecord[]>([]);
  const [otMonthlyLoading, setOtMonthlyLoading] = useState(false);
  const [exportingLeave, setExportingLeave] = useState(false);
  const [exportingOt, setExportingOt] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const buildScopedParams = useCallback(() => {
    const queryParams = new URLSearchParams();
    if (role === 'admin' && selectedBranch !== 'all') {
      queryParams.set('branch', selectedBranch);
    } else if (role === 'leader' && user?.branch) {
      queryParams.set('branch', user.branch);
    }
    if (selectedEmployeeId !== 'all') {
      queryParams.set('userId', selectedEmployeeId);
    }
    return queryParams;
  }, [role, selectedBranch, selectedEmployeeId, user?.branch]);

  const fetchEmployees = useCallback(async () => {
    if (!user) return;

    const queryParams = new URLSearchParams({ activeOnly: 'true' });
    if (role === 'admin' && selectedBranch !== 'all') {
      queryParams.set('branch', selectedBranch);
    } else if (role === 'leader' && user.branch) {
      queryParams.set('branch', user.branch);
    }

    const response = await fetch(`/api/users?${queryParams.toString()}`);
    const data = await response.json();
    if (data.success) {
      const targetBranch = role === 'leader' ? user.branch : selectedBranch !== 'all' ? selectedBranch : undefined;
      const scopedUsers = targetBranch
        ? data.users.filter((employee: EmployeeOption) => employee.branch?.toLowerCase() === targetBranch.toLowerCase())
        : data.users;
      setEmployees(scopedUsers);
    }
  }, [role, selectedBranch, user]);

  const fetchLeaves = useCallback(async (page = 1, append = false) => {
    const queryParams = buildScopedParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(LEAVE_PAGE_SIZE));

    const response = await fetch(`/api/leave?${queryParams.toString()}`);
    const data = await response.json();
    if (data.success) {
      setLeaves((current) => append ? [...current, ...data.requests] : data.requests);
      setLeavePagination(data.pagination);
    }
  }, [buildScopedParams]);

  const fetchOt = useCallback(async (page = 1, append = false) => {
    const queryParams = buildScopedParams();
    queryParams.set('page', String(page));
    queryParams.set('limit', String(LEAVE_PAGE_SIZE));

    const response = await fetch(`/api/ot?${queryParams.toString()}`);
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
        const sorted = attendanceData.records.sort((a: AttendanceRecord, b: AttendanceRecord) => 
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

  const handleBranchSelect = useCallback((branch: string) => {
    setSelectedBranch(branch);
    setSelectedEmployeeId('all');
  }, []);

  const exportScopeLabel = useCallback(() => {
    const branchPart = role === 'leader' ? (user?.branch || 'all') : selectedBranch;
    const employee = employees.find((e) => e._id === selectedEmployeeId);
    const personPart = employee ? (employee.employeeId || employee._id) : 'all';
    return `${branchPart}_${personPart}`;
  }, [role, user?.branch, selectedBranch, selectedEmployeeId, employees]);

  const handleExportLeave = useCallback(async () => {
    setExportingLeave(true);
    try {
      const params = buildScopedParams();
      params.set('status', 'approved');
      const response = await fetch(`/api/leave?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        const exported = exportLeaveHistoryCsv(data.requests, `leave_${exportScopeLabel()}.csv`);
        if (!exported) alert('ไม่มีข้อมูลการลาที่อนุมัติแล้วตามเงื่อนไขที่เลือก');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถดาวน์โหลดข้อมูลได้');
    } finally {
      setExportingLeave(false);
    }
  }, [buildScopedParams, exportScopeLabel]);

  const handleExportOt = useCallback(async () => {
    setExportingOt(true);
    try {
      const params = buildScopedParams();
      params.set('status', 'approved');
      const response = await fetch(`/api/ot?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        const exported = exportOtHistoryCsv(data.requests, `income_${exportScopeLabel()}.csv`);
        if (!exported) alert('ไม่มีข้อมูลรายได้พิเศษที่อนุมัติแล้วตามเงื่อนไขที่เลือก');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถดาวน์โหลดข้อมูลได้');
    } finally {
      setExportingOt(false);
    }
  }, [buildScopedParams, exportScopeLabel]);

  const handleLeaveChanged = useCallback(async () => {
    fetchLeaves(1, false);
  }, [fetchLeaves]);

  const handleOtChanged = useCallback(async () => {
    fetchOt(1, false);
    if (otSubView === 'monthly') {
      fetchOtMonthly();
    }
  }, [fetchOt, fetchOtMonthly, otSubView]);

  usePusher('leave-requests', [
    { event: 'new-leave-request', callback: handleLeaveChanged },
    { event: 'leave-status-changed', callback: handleLeaveChanged },
    { event: 'leave-cancelled', callback: handleLeaveChanged },
  ], !!user);

  usePusher('ot-requests', [
    { event: 'new-ot-request', callback: handleOtChanged },
    { event: 'ot-status-changed', callback: handleOtChanged },
    { event: 'ot-cancelled', callback: handleOtChanged },
  ], !!user);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ประวัติทั้งหมด" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => handleBranchSelect('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {BRANCHES.map(b => (
                  <button
                    key={b}
                    onClick={() => handleBranchSelect(b)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </motion.div>
            )}

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
                  <option value="all">ทุกคน{role === 'leader' && user.branch ? `ในสาขา ${user.branch}` : selectedBranch !== 'all' ? `ในสาขา ${selectedBranch}` : ''}</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {getEmployeeLabel(employee)}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  Export CSV จะดึงเฉพาะรายการที่อนุมัติแล้ว ตามสาขา/พนักงานที่เลือกไว้ด้านบน
                </p>
                {activeTab === 'leave' ? (
                  <button
                    type="button"
                    onClick={handleExportLeave}
                    disabled={exportingLeave}
                    className="btn btn-secondary w-full mt-2 text-fluid-sm"
                  >
                    {exportingLeave ? (
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export CSV (การลา)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExportOt}
                    disabled={exportingOt}
                    className="btn btn-secondary w-full mt-2 text-fluid-sm"
                  >
                    {exportingOt ? (
                      <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export CSV (รายได้พิเศษ)
                  </button>
                )}
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
                      <motion.div
                        key={request._id}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="card overflow-hidden"
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
                      </motion.div>
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
                      <motion.div
                        key={request._id}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="card overflow-hidden"
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
                      </motion.div>
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
                    <motion.div
                      key={record._id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="card overflow-hidden"
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
                    </motion.div>
                  ))}
                </div>
              )
            ) : activeTab === 'attendance' ? (
              attendance.length === 0 ? (
                <AdminEmptyState icon={Clock} message="ไม่มีประวัติการลงเวลา" />
              ) : (
                <div className="space-y-4">
                  {attendance.map((rec, index) => (
                    <motion.div
                      key={rec._id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="card bg-[var(--bg-surface)] border border-[var(--border)] overflow-hidden"
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
                    </motion.div>
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
      <BottomNav role="leader" />
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

export default function LeaderHistoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LeaderHistoryContent />
    </Suspense>
  );
}
