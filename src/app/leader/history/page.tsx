'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, ClipboardList, CalendarDays, Phone } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta, getRecordTypeLabel, getStatusBadge } from '@/lib/leave-types';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';

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


function LeaderHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [substitutes, setSubstitutes] = useState<SubstituteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leave');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) {
      router.push('/leader/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [leaveRes, substituteRes] = await Promise.all([
          fetch('/api/leave'),
          fetch('/api/substitute'),
        ]);

        const leaveData = await leaveRes.json();
        const substituteData = await substituteRes.json();

        if (leaveData.success) {
          setLeaves(leaveData.requests);
        }
        if (substituteData.success) {
          setSubstitutes(substituteData.records);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);


  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="ประวัติทั้งหมด" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'leave', label: `การลา (${leaves.length})` },
                { key: 'substitute', label: `บันทึกแทน (${substitutes.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="btn text-fluid-sm"
                  style={{
                    background: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-surface)',
                    color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                    border: activeTab === tab.key ? 'none' : '1px solid var(--border)',
                    boxShadow: activeTab === tab.key ? 'var(--shadow-accent)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : activeTab === 'leave' ? (
              leaves.length === 0 ? (
                <div className="card p-12 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีประวัติการลา</p>
                </div>
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
                      </motion.div>
                    );
                  })}
                </div>
              )
            ) : (
              substitutes.length === 0 ? (
                <div className="card p-12 text-center">
                  <ClipboardList className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีประวัติบันทึกแทน</p>
                </div>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
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
