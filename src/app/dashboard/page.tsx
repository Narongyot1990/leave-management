'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, X, Phone, Star, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { getHolidayMap, getHolidaysForMonth } from '@/lib/thai-holidays';
import { getLeaveTypeMeta, LEAVE_TYPE_LIST } from '@/lib/leave-types';
import { formatDateThai as formatDateThaiUtil, getLeaveDays as getLeaveDaysUtil } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';

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

interface DayData {
  date: number;
  leaves: LeaveRequest[];
}


const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function DashboardContent() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'driver' | 'leader' | 'admin'>('driver');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showPopup, setShowPopup] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    const fetchLeaves = async () => {
      setLoading(true);
      try {
        let url = '/api/leave?status=approved';
        
        // Driver and Leader: API uses JWT token to determine branch automatically
        // Admin with specific branch filter
        if (role === 'admin' && selectedBranch !== 'all') {
          url += `&branch=${selectedBranch}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setLeaves(data.requests);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [user, role, selectedBranch]);

  // Pusher realtime — calendar auto-refresh on leave changes
  const handleLeaveChanged = useCallback(async () => {
    try {
      let url = '/api/leave?status=approved';
      if (role === 'admin' && selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) setLeaves(data.requests);
    } catch { /* ignore */ }
  }, [role, selectedBranch]);

  usePusher('dashboard', [
    { event: 'leave-status-changed', callback: handleLeaveChanged },
    { event: 'leave-cancelled', callback: handleLeaveChanged },
  ], !!user);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getLeavesForDay = (day: number): LeaveRequest[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    return leaves.filter(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const checkDate = new Date(dateStr);
      return checkDate >= start && checkDate <= end;
    });
  };

  const handleDayClick = (day: number) => {
    const dayLeaves = getLeavesForDay(day);
    if (dayLeaves.length > 0) {
      setSelectedDay({ date: day, leaves: dayLeaves });
      setShowPopup(true);
    }
  };


  const exportToCSV = () => {
    const monthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate.getMonth() === month && leaveDate.getFullYear() === year;
    });

    if (monthLeaves.length === 0) {
      alert('ไม่มีข้อมูลการลาในเดือนนี้');
      return;
    }

    const headers = ['วันที่', 'ชื่อ-นามสกุล', 'ประเภทการลา', 'วันที่เริ่ม', 'วันที่สิ้นสุด', 'สถานะ'];
    const rows = monthLeaves.map(leave => [
      formatDateThaiUtil(leave.createdAt),
      `${leave.userId?.name || ''} ${leave.userId?.surname || ''}`,
      getLeaveTypeMeta(leave.leaveType).label,
      formatDateThaiUtil(leave.startDate),
      formatDateThaiUtil(leave.endDate),
      'อนุมัติ'
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_report_${year}_${month + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
      <PageHeader
        title="Dashboard"
        backHref="/home"
        rightContent={
          <button onClick={exportToCSV} className="btn btn-ghost w-10 h-10 p-0" title="Export CSV">
            <Download className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
          </button>
        }
      />

      <div className="px-4 lg:px-8 py-4">
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

          {/* Current Branch Indicator (Driver/Leader) */}
          {role !== 'admin' && user?.branch && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-surface/50 border border-border">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">กำลังแสดงข้อมูลสาขา:</span>
              <span className="text-[11px] font-black text-accent">{user.branch}</span>
            </motion.div>
          )}

          {/* Month Selector */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4">
            <div className="flex items-center justify-between">
              <button onClick={goToPrevMonth} className="btn btn-ghost w-10 h-10 p-0">
                <ChevronLeft className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
              </button>
              <h2 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {THAI_MONTHS[month]} {year + 543}
              </h2>
              <button onClick={goToNextMonth} className="btn btn-ghost w-10 h-10 p-0">
                <ChevronRight className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
              </button>
            </div>
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
                            {holiday && !hasLeaves && (
                              <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: '#ef4444', opacity: 0.5 }} />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {leaves.length === 0 && (
                  <div className="p-12 text-center" style={{ background: 'var(--bg-surface)' }}>
                    <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center mx-auto mb-4 border border-border">
                      <AlertCircle className="w-8 h-8 text-muted opacity-30" />
                    </div>
                    <h4 className="text-[13px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>ไม่พบข้อมูลการลา</h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {role === 'admin' && selectedBranch === 'all' 
                        ? 'ไม่พบข้อมูลการลาที่ผ่านการอนุมัติในระบบ'
                        : `ยังไม่มีการอนุมัติใบลาในสาขา ${role === 'admin' ? selectedBranch : user?.branch}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3">
            {LEAVE_TYPE_LIST.map((lt) => (
              <div key={lt.value} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${lt.bgClass}`} />
                <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{lt.label}</span>
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
                  {selectedDay.date} {THAI_MONTHS[month]} {year + 543} ({selectedDay.leaves.length} คน)
                </h3>
                <button onClick={() => setShowPopup(false)} className="btn btn-ghost w-7 h-7 p-0 min-h-0 min-w-0">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <div className="p-2 space-y-1.5 overflow-y-auto max-h-[55vh]">
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
                      <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>@{leave.userId?.lineDisplayName}</p>
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



