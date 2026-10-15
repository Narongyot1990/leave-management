'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, RefreshCw, X, Phone, Star, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { getHolidayMap, getHolidaysForMonth } from '@/lib/thai-holidays';
import { getLeaveTypeMeta, getStatusBadge, LEAVE_TYPE_LIST } from '@/lib/leave-types';
import { getIncomeClaimTypeMeta, INCOME_CLAIM_TYPE_LIST } from '@/lib/ot-types';
import { getWorkDurationLabel } from '@/lib/ot-duration';
import { formatDateThai as formatDateThaiUtil, getLeaveDays as getLeaveDaysUtil } from '@/lib/date-utils';
import { buildDateKey, leaveSpansDateKey, leaveStartsInMonth, otInMonth, otMatchesDateKey } from '@/lib/leave-calendar';
import { downloadCsv } from '@/lib/csv-export';
import type { AppRole, LeavePersonSummary, LeaveRequestRecord, SessionUser } from '@/lib/app-types';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';

interface OtRecord {
  _id: string;
  userId: LeavePersonSummary;
  date: string;
  claimType: string;
  startTime?: string;
  endTime?: string;
  reason: string;
  status: string;
  approvedBy?: LeavePersonSummary;
  approvedAt?: string;
}

interface DayData {
  date: number;
  leaves: LeaveRequestRecord[];
  ot: OtRecord[];
}


const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function DashboardContent() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [role, setRole] = useState<AppRole>('driver');
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [otRecords, setOtRecords] = useState<OtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'leave' | 'income'>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'driver');
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

  const fetchLeaves = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Aggressive cache-busting with timestamp
      let url = `/api/leave?status=approved&t=${Date.now()}`;
      
      if (role === 'admin' && selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      } else if (role === 'leader' && user?.branch) {
        url += `&branch=${user.branch}`;
      }
      
      const response = await fetch(url, { 
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setLeaves(data.requests);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, role, selectedBranch]);

  const fetchOt = useCallback(async () => {
    if (!user) return;
    try {
      let url = `/api/ot?status=approved&t=${Date.now()}`;

      if (role === 'admin' && selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      } else if (role === 'leader' && user?.branch) {
        url += `&branch=${user.branch}`;
      }

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setOtRecords(data.requests);
      }
    } catch (err) {
      console.error("Dashboard OT fetch error:", err);
    }
  }, [user, role, selectedBranch]);

  useEffect(() => {
    fetchLeaves();
    fetchOt();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaves();
        fetchOt();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(() => {
      fetchLeaves();
      fetchOt();
    }, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchLeaves, fetchOt]);

  // Comprehensive Pusher listener for all leave changes
  usePusher('dashboard', [
    { event: 'leave-status-changed', callback: fetchLeaves },
    { event: 'leave-cancelled', callback: fetchLeaves },
    { event: 'ot-status-changed', callback: fetchOt },
    { event: 'ot-cancelled', callback: fetchOt },
  ], !!user);

  usePusher('leave-requests', [
    { event: 'new-leave-request', callback: fetchLeaves },
    { event: 'leave-status-changed', callback: fetchLeaves },
  ], !!user);

  usePusher('ot-requests', [
    { event: 'new-ot-request', callback: fetchOt },
    { event: 'ot-status-changed', callback: fetchOt },
  ], !!user);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getLeavesForDay = (day: number): LeaveRequestRecord[] => {
    if (viewMode === 'income') return [];
    const dateKey = buildDateKey(year, month, day);

    return leaves.filter(leave => {
      return leaveSpansDateKey(leave.startDate, leave.endDate, dateKey);
    });
  };

  const getOtForDay = (day: number): OtRecord[] => {
    if (viewMode === 'leave') return [];
    const dateKey = buildDateKey(year, month, day);

    return otRecords.filter(ot => otMatchesDateKey(ot.date, dateKey));
  };

  const handleDayClick = (day: number) => {
    const dayLeaves = getLeavesForDay(day);
    const dayOt = getOtForDay(day);
    if (dayLeaves.length > 0 || dayOt.length > 0) {
      setSelectedDay({ date: day, leaves: dayLeaves, ot: dayOt });
      setShowPopup(true);
    }
  };


  const personName = (p?: LeavePersonSummary) =>
    p ? (`${p.name || ''} ${p.surname || ''}`.trim() || p.lineDisplayName || '') : '';

  const exportLeaveCsv = () => {
    const monthLeaves = leaves.filter(leave => leaveStartsInMonth(leave.startDate, year, month));
    if (monthLeaves.length === 0) {
      alert('ไม่มีข้อมูลการลาในเดือนนี้');
      return false;
    }

    const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สาขา', 'ประเภทการลา', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'จำนวนวัน', 'สถานะ', 'ผู้อนุมัติ', 'วันที่อนุมัติ'];
    const rows = monthLeaves.map(leave => [
      leave.userId?.employeeId || '',
      personName(leave.userId),
      leave.userId?.branch || '',
      getLeaveTypeMeta(leave.leaveType).label,
      formatDateThaiUtil(leave.startDate),
      formatDateThaiUtil(leave.endDate),
      getLeaveDaysUtil(leave.startDate, leave.endDate),
      getStatusBadge(leave.status).label,
      personName(leave.approvedBy),
      leave.approvedAt ? formatDateThaiUtil(leave.approvedAt) : '',
    ]);

    downloadCsv(`leave_report_${year}_${month + 1}.csv`, headers, rows);
    return true;
  };

  const exportOtCsv = () => {
    const monthOt = otRecords.filter(ot => otInMonth(ot.date, year, month));
    if (monthOt.length === 0) {
      alert('ไม่มีข้อมูลรายได้พิเศษในเดือนนี้');
      return false;
    }

    const headers = ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สาขา', 'ประเภทรายได้พิเศษ', 'วันที่', 'เวลาเริ่ม', 'เวลาจบ', 'รวมเวลาทำงาน', 'เหตุผล', 'สถานะ', 'ผู้อนุมัติ', 'วันที่อนุมัติ'];
    const rows = monthOt.map(ot => [
      ot.userId?.employeeId || '',
      personName(ot.userId),
      ot.userId?.branch || '',
      getIncomeClaimTypeMeta(ot.claimType).label,
      formatDateThaiUtil(ot.date),
      ot.startTime || '',
      ot.endTime || '',
      getWorkDurationLabel(ot.startTime, ot.endTime) || '',
      ot.reason,
      getStatusBadge(ot.status).label,
      personName(ot.approvedBy),
      ot.approvedAt ? formatDateThaiUtil(ot.approvedAt) : '',
    ]);

    downloadCsv(`income_report_${year}_${month + 1}.csv`, headers, rows);
    return true;
  };

  const exportToCSV = () => {
    if (viewMode === 'leave') {
      exportLeaveCsv();
      return;
    }
    if (viewMode === 'income') {
      exportOtCsv();
      return;
    }

    const leaveExported = exportLeaveCsv();
    const otExported = exportOtCsv();
    if (!leaveExported && !otExported) {
      alert('ไม่มีข้อมูลในเดือนนี้');
    }
  };

  if (!user) {
    return null;
  }

  const holidayMap = getHolidayMap(year, month);
  const monthHolidays = getHolidaysForMonth(year, month);

  const calendarDays: (number | null)[] = [];
  
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push(null);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
      <PageHeader
        title="Dashboard"
        backHref="/home"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchLeaves(); fetchOt(); }}
              disabled={loading}
              className="btn btn-ghost w-12 h-12 p-0 rounded-full"
              style={{ background: 'var(--accent-light)' }}
              title="รีเฟรช"
            >
              <RefreshCw className={`w-7 h-7 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
            </button>
            <button
              onClick={exportToCSV}
              className="btn btn-ghost w-12 h-12 p-0 rounded-full"
              style={{ background: 'var(--accent-light)' }}
              title={viewMode === 'leave' ? 'Export CSV (ลา)' : viewMode === 'income' ? 'Export CSV (รายได้พิเศษ)' : 'Export CSV (ลา + รายได้พิเศษ)'}
            >
              <Download className="w-7 h-7" strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
            </button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 py-3">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Month + Branch, combined into one row */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-2.5 flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="btn btn-ghost w-12 h-12 p-0 rounded-full shrink-0"
              style={{ background: 'var(--accent-light)' }}
            >
              <ChevronLeft className="w-7 h-7" strokeWidth={3} style={{ color: 'var(--accent)' }} />
            </button>
            <h2 className="flex-1 min-w-0 text-center text-fluid-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {THAI_MONTHS[month]} {year + 543}
            </h2>
            <button
              onClick={goToNextMonth}
              className="btn btn-ghost w-12 h-12 p-0 rounded-full shrink-0"
              style={{ background: 'var(--accent-light)' }}
            >
              <ChevronRight className="w-7 h-7" strokeWidth={3} style={{ color: 'var(--accent)' }} />
            </button>

            <div className="w-px h-6 shrink-0" style={{ background: 'var(--border)' }} />

            {role === 'admin' ? (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="input shrink-0 py-2 px-2 text-fluid-xs font-bold"
                style={{ width: '104px' }}
              >
                <option value="all">ทุกสาขา</option>
                {(branchesLoading ? [] : branches).map((b) => (
                  <option key={b.code} value={b.code}>สาขา {b.code}</option>
                ))}
              </select>
            ) : user?.branch ? (
              <span
                className="shrink-0 text-[11px] font-black px-3 py-2 rounded-full whitespace-nowrap"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {user.branch}
              </span>
            ) : null}
          </motion.div>

          {/* View mode: overview / leave only / income only */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.02 }} className="card p-1.5 flex items-center gap-1">
            {([
              { key: 'all', label: 'ภาพรวม' },
              { key: 'leave', label: 'ลา' },
              { key: 'income', label: 'รายได้' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setViewMode(opt.key)}
                className="flex-1 py-2 rounded-[var(--radius-md)] text-fluid-xs font-bold transition-all"
                style={{
                  background: viewMode === opt.key ? 'var(--accent)' : 'transparent',
                  color: viewMode === opt.key ? 'white' : 'var(--text-muted)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>

          {/* Calendar */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card overflow-hidden">
            <div className="grid grid-cols-7" style={{ background: 'var(--bg-inset)' }}>
              {THAI_DAYS.map((day) => (
                <div key={day} className="py-2.5 text-center text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {day}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const dayLeaves = day ? getLeavesForDay(day) : [];
                    const hasLeaves = dayLeaves.length > 0;
                    const dayOt = day ? getOtForDay(day) : [];
                    const hasOt = dayOt.length > 0;
                    const holiday = day ? holidayMap.get(day) : undefined;
                    return (
                      <div
                        key={index}
                        onClick={() => day && handleDayClick(day)}
                        className="min-h-[3.2rem] flex flex-col items-center justify-start pt-2 transition-colors relative"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                          cursor: day ? 'pointer' : 'default',
                          background: holiday
                            ? 'rgba(239, 68, 68, 0.08)'
                            : day
                              ? 'transparent'
                              : 'var(--bg-inset)',
                        }}
                      >
                        {day && (
                          <>
                            <span className="text-xs font-medium" style={{ color: holiday ? '#ef4444' : hasLeaves ? 'var(--text-primary)' : 'var(--text-muted)' }}>{day}</span>
                            {hasLeaves && (() => {
                              const types = Array.from(new Set(dayLeaves.map(l => l.leaveType)));
                              return (
                                <div className="flex items-center mt-0.5" style={{ gap: types.length > 1 ? '-2px' : '0' }}>
                                  {types.slice(0, 3).map((type, i) => (
                                    <div
                                      key={type}
                                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center text-white font-bold ${getLeaveTypeMeta(type).bgClass}`}
                                      style={{
                                        fontSize: '8px',
                                        marginLeft: i > 0 ? '-4px' : '0',
                                        borderColor: 'var(--bg-surface)',
                                        zIndex: 3 - i,
                                        position: 'relative',
                                      }}
                                    >
                                      {i === 0 ? dayLeaves.length : ''}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            {hasOt && (() => {
                              const claimTypes = Array.from(new Set(dayOt.map(o => o.claimType)));
                              return (
                                <div className="flex items-center mt-0.5" style={{ gap: claimTypes.length > 1 ? '-2px' : '0' }}>
                                  {claimTypes.slice(0, 3).map((claimType, i) => (
                                    <div
                                      key={claimType}
                                      className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center text-white font-bold ${getIncomeClaimTypeMeta(claimType).bgClass}`}
                                      style={{
                                        fontSize: '8px',
                                        marginLeft: i > 0 ? '-4px' : '0',
                                        borderColor: 'var(--bg-surface)',
                                        zIndex: 3 - i,
                                        position: 'relative',
                                      }}
                                      title={getIncomeClaimTypeMeta(claimType).label}
                                    >
                                      {i === 0 ? dayOt.length : ''}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                            {holiday && !hasLeaves && !hasOt && (
                              <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: '#ef4444', opacity: 0.5 }} />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {(() => {
                  const hasLeaveData = leaves.length > 0;
                  const hasOtData = otRecords.length > 0;
                  const isEmpty =
                    viewMode === 'leave' ? !hasLeaveData
                    : viewMode === 'income' ? !hasOtData
                    : !hasLeaveData && !hasOtData;
                  if (!isEmpty) return null;

                  const scopeLabel = role === 'admin' ? selectedBranch : user?.branch;
                  const dataLabel = viewMode === 'income' ? 'รายได้พิเศษ' : viewMode === 'leave' ? 'การลา' : 'การลาและรายได้พิเศษ';

                  return (
                    <div className="p-12 text-center" style={{ background: 'var(--bg-surface)' }}>
                      <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4 border border-border">
                        <AlertCircle className="w-8 h-8 text-muted opacity-30" />
                      </div>
                      <h4 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>ไม่พบข้อมูล{dataLabel}</h4>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {role === 'admin' && selectedBranch === 'all'
                          ? `ไม่พบข้อมูล${dataLabel}ที่ผ่านการอนุมัติในระบบ`
                          : `ยังไม่มีการอนุมัติ${dataLabel}ในสาขา ${scopeLabel}`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3">
            {viewMode !== 'income' && LEAVE_TYPE_LIST.map((lt) => (
              <div key={lt.value} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${lt.bgClass}`} />
                <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{lt.label}</span>
              </div>
            ))}
            {viewMode !== 'leave' && INCOME_CLAIM_TYPE_LIST.map((ct) => (
              <div key={ct.value} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${ct.bgClass}`} />
                <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{ct.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444', opacity: 0.5 }} />
              <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>วันหยุดบริษัท</span>
            </div>
          </div>

          {/* Company Holidays List */}
          {monthHolidays.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 overflow-x-auto pb-1"
            >
              <Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <span className="text-fluid-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>วันหยุด:</span>
              {monthHolidays.map((holiday) => {
                const d = holiday.date.split('-');
                const dayNum = parseInt(d[2]);
                return (
                  <span 
                    key={holiday.date} 
                    className="text-fluid-xs px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  >
                    {dayNum} {holiday.nameTh}
                  </span>
                );
              })}
            </motion.div>
          )}

        </div>
      </div>

      {/* Popup */}
      <AnimatePresence>
        {showPopup && selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowPopup(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="card-neo w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] max-h-[70vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedDay.date} {THAI_MONTHS[month]} {year + 543}
                </h3>
                <button onClick={() => setShowPopup(false)} className="btn btn-ghost w-7 h-7 p-0 min-h-0 min-w-0">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <div className="p-2 space-y-1.5 overflow-y-auto max-h-[55vh]">
                {selectedDay.leaves.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-wider px-1 pt-1" style={{ color: 'var(--text-muted)' }}>
                    🍃 ลา ({selectedDay.leaves.length} คน)
                  </p>
                )}
                {selectedDay.leaves.map((leave) => (
                  <div key={leave._id} className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <UserAvatar
                      imageUrl={leave.userId?.lineProfileImage}
                      displayName={leave.userId?.name || leave.userId?.lineDisplayName}
                      tier={leave.userId?.performanceTier}
                      size="sm"
                      onClick={() => { setProfileUser(leave.userId as ProfileUser); setShowProfile(true); }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {leave.userId?.name && leave.userId?.surname
                            ? `${leave.userId.name} ${leave.userId.surname}`
                            : leave.userId?.lineDisplayName || 'Unknown'}
                          {leave.userId?.employeeId && (
                            <span className="text-fluid-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>({leave.userId.employeeId})</span>
                          )}
                        </p>
                        {leave.userId?.phone && (
                          <a href={`tel:${leave.userId.phone}`} className="shrink-0">
                            <Phone className="w-3.5 h-3.5" style={{ color: '#00C853' }} strokeWidth={2} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>@{leave.userId?.lineDisplayName}</p>
                        
                        {/* Approved By info */}
                        {leave.approvedBy && (
                          <div className="flex items-center gap-1.5 opacity-80">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">By</span>
                            <UserAvatar
                              imageUrl={leave.approvedBy.lineProfileImage}
                              displayName={leave.approvedBy.name || leave.approvedBy.lineDisplayName}
                              tier={leave.approvedBy.performanceTier}
                              size="xs"
                              onClick={() => { setProfileUser(leave.approvedBy as ProfileUser); setShowProfile(true); }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getLeaveTypeMeta(leave.leaveType).bgClass}`} />
                        <p className="text-fluid-xs" style={{ color: getLeaveTypeMeta(leave.leaveType).color }}>
                          {getLeaveTypeMeta(leave.leaveType).label} ({getLeaveDaysUtil(leave.startDate, leave.endDate)} วัน)
                        </p>
                      </div>
                      {leave.reason && (
                        <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{leave.reason}</p>
                      )}
                    </div>
                  </div>
                ))}

                {selectedDay.ot.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-wider px-1 pt-2" style={{ color: 'var(--text-muted)' }}>
                    ⏰ รายได้พิเศษ ({selectedDay.ot.length} คน)
                  </p>
                )}
                {selectedDay.ot.map((ot) => (
                  <div key={ot._id} className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <UserAvatar
                      imageUrl={ot.userId?.lineProfileImage}
                      displayName={ot.userId?.name || ot.userId?.lineDisplayName}
                      tier={ot.userId?.performanceTier}
                      size="sm"
                      onClick={() => { setProfileUser(ot.userId as ProfileUser); setShowProfile(true); }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {ot.userId?.name && ot.userId?.surname
                            ? `${ot.userId.name} ${ot.userId.surname}`
                            : ot.userId?.lineDisplayName || 'Unknown'}
                          {ot.userId?.employeeId && (
                            <span className="text-fluid-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>({ot.userId.employeeId})</span>
                          )}
                        </p>
                        {ot.userId?.phone && (
                          <a href={`tel:${ot.userId.phone}`} className="shrink-0">
                            <Phone className="w-3.5 h-3.5" style={{ color: '#00C853' }} strokeWidth={2} />
                          </a>
                        )}
                      </div>
                      <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>@{ot.userId?.lineDisplayName}</p>
                      <p className="text-fluid-xs mt-1 font-medium" style={{ color: getIncomeClaimTypeMeta(ot.claimType).color }}>
                        {getIncomeClaimTypeMeta(ot.claimType).label}
                      </p>
                      {(() => {
                        const durationLabel = getWorkDurationLabel(ot.startTime, ot.endTime);
                        return durationLabel ? (
                          <p className="text-fluid-xs" style={{ color: 'var(--accent)' }}>
                            {ot.startTime}–{ot.endTime} ({durationLabel})
                          </p>
                        ) : null;
                      })()}
                      {ot.reason && (
                        <p className="text-fluid-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ot.reason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      </div>
      <BottomNav role={role} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardContent />
  );
}



