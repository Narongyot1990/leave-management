'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Search, Edit3, Trash2, X, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Plus, Phone, PhoneCall, MessageCircle, Shield, ChevronRight, MapPin, User } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { PERFORMANCE_TIERS, PERFORMANCE_TIER_CONFIG, type PerformanceTier } from '@/lib/profile-tier';
import { formatDateThai, formatRelativeTime, isUserOnline } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { useToast } from '@/components/Toast';

// Rename the internal role state to avoid confusion with the Personnel interface role

interface Personnel {
  _id: string;
  lineUserId: string;
  linePublicId?: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  role: 'driver' | 'leader' | 'admin';
  status: 'pending' | 'active';
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  lastSeen?: string;
  isOnline?: boolean;
  createdAt?: string;
}
function DriverManagementContent() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState<'all' | 'pending' | 'active'>('all');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const personnelList = (activeTab === 'all' 
    ? allPersonnel 
    : allPersonnel.filter(d => d.status === activeTab));

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
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchDrivers = async () => {
    try {
      const params = new URLSearchParams();
      if (role === 'admin' && selectedBranch !== 'all') {
        params.set('branch', selectedBranch);
      } else if (role === 'leader' && user?.branch) {
        params.set('branch', user.branch);
      }
      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setAllPersonnel(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchDrivers();
    
    // Refresh every 30 seconds to update online status
    const interval = setInterval(fetchDrivers, 30000);
    return () => clearInterval(interval);
  }, [user, role, selectedBranch]);

  const { showToast } = useToast();

  // Pusher realtime — driver list auto-refresh
  const handleDriverChanged = useCallback(() => {
    fetchDrivers();
  }, [role, selectedBranch]);

  const handleNewDriver = useCallback((data: { displayName?: string }) => {
    fetchDrivers();
    showToast('notification', `พนักงานใหม่ลงทะเบียน: ${data?.displayName || 'พนักงาน'}`);
  }, [showToast, role, selectedBranch]);

  usePusher('users', [
    { event: 'new-driver', callback: handleNewDriver },
    { event: 'driver-activated', callback: handleDriverChanged },
    { event: 'driver-updated', callback: handleDriverChanged },
    { event: 'driver-deleted', callback: handleDriverChanged },
  ], !!user);

  const handleActivate = async (driverId: string, additionalData: any = {}) => {
    setActionLoading(driverId);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: driverId, status: 'active', ...additionalData }),
      });
      const data = await response.json();
      if (data.success) {
        setAllPersonnel(prev => prev.map(d => d._id === driverId ? { ...d, status: 'active', ...additionalData } : d));
        // Instead of closing, update selectedPersonnel to transition to Step 2
        setSelectedPersonnel(prev => prev ? { ...prev, status: 'active', ...additionalData } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (driverId: string) => {
    setActionLoading(driverId);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: driverId, status: 'pending' }),
      });
      const data = await response.json();
      if (data.success) {
        setAllPersonnel(prev => prev.map(d => d._id === driverId ? { ...d, status: 'pending' } : d));
        setSelectedPersonnel(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnel) return;
    
    setActionLoading(selectedPersonnel._id);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedPersonnel._id,
          name: selectedPersonnel.name,
          surname: selectedPersonnel.surname,
          phone: selectedPersonnel.phone,
          linePublicId: selectedPersonnel.linePublicId,
          employeeId: selectedPersonnel.employeeId,
          vacationDays: selectedPersonnel.vacationDays,
          sickDays: selectedPersonnel.sickDays,
          personalDays: selectedPersonnel.personalDays,
          performanceTier: selectedPersonnel.performanceTier,
          branch: selectedPersonnel.branch,
          role: selectedPersonnel.role,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAllPersonnel(prev => prev.map(d => d._id === selectedPersonnel._id ? { ...d, ...data.user } : d));
        // If it was Step 2 (null branch), update selectedPersonnel to transition to Step 3
        // If it was Step 3, we can keep it open for further edits or close it. 
        // Let's update it so the UI reflects the saved state.
        setSelectedPersonnel({ ...selectedPersonnel, ...data.user });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDriver = async () => {
    if (!deletingId) return;
    setActionLoading(deletingId);
    try {
      const response = await fetch(`/api/users?id=${deletingId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setAllPersonnel(prev => prev.filter(d => d._id !== deletingId));
        setShowDeleteModal(false);
        setDeletingId(null);
        setSelectedPersonnel(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="จัดการพนักงาน" subtitle="เพิ่ม/แก้ไข/เปิดใช้งานพนักงาน" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

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

        {/* Stats - Clickable */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className="text-center p-2.5 rounded-[var(--radius-md)] transition-all"
            style={{ 
              background: activeTab === 'all' ? 'var(--accent)' : 'var(--bg-inset)',
              boxShadow: activeTab === 'all' ? 'var(--shadow-accent)' : 'none'
            }}
          >
            <p className="text-fluid-lg font-extrabold" style={{ color: activeTab === 'all' ? 'white' : 'var(--accent)' }}>{allPersonnel.length}</p>
            <p className="text-fluid-xs" style={{ color: activeTab === 'all' ? 'white' : 'var(--text-muted)' }}>ทั้งหมด</p>
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className="text-center p-2.5 rounded-[var(--radius-md)] transition-all"
            style={{ 
              background: activeTab === 'pending' ? 'var(--warning)' : 'var(--bg-inset)',
              boxShadow: activeTab === 'pending' ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
            }}
          >
            <p className="text-fluid-lg font-extrabold" style={{ color: activeTab === 'pending' ? 'white' : 'var(--warning)' }}>
              {personnelList.filter(d => d.status === 'pending').length}
            </p>
            <p className="text-fluid-xs" style={{ color: activeTab === 'pending' ? 'white' : 'var(--text-muted)' }}>รอยืนยัน</p>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className="text-center p-2.5 rounded-[var(--radius-md)] transition-all"
            style={{ 
              background: activeTab === 'active' ? 'var(--success)' : 'var(--bg-inset)',
              boxShadow: activeTab === 'active' ? '0 4px 12px rgba(5,150,105,0.3)' : 'none'
            }}
          >
            <p className="text-fluid-lg font-extrabold" style={{ color: activeTab === 'active' ? 'white' : 'var(--success)' }}>
              {personnelList.filter(d => d.status === 'active').length}
            </p>
            <p className="text-fluid-xs" style={{ color: activeTab === 'active' ? 'white' : 'var(--text-muted)' }}>พร้อมใช้</p>
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : personnelList.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีพนักงาน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {personnelList.map((driver) => (
                <motion.div
                  key={driver._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedPersonnel(driver)}
                  className="card p-4 flex items-center gap-4 cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <UserAvatar
                      imageUrl={driver.lineProfileImage}
                      displayName={driver.name || driver.lineDisplayName}
                      tier={driver.performanceTier}
                      size="sm"
                      onClick={() => { setProfileUser(driver as unknown as ProfileUser); setShowProfile(true); }}
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        background: isUserOnline(driver.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
                        borderColor: 'var(--bg-surface)',
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${driver.status === 'active' ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--warning-light)] text-[var(--warning)]'}`}>
                        {driver.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${driver.role === 'leader' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}>
                        {driver.role || 'Driver'}
                      </span>
                      {driver.branch && (
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">
                          {driver.branch}
                        </span>
                      )}
                    </div>
                    <h3 className="text-fluid-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
                      {driver.name && driver.surname ? `${driver.name} ${driver.surname}` : driver.lineDisplayName}
                    </h3>
                    <p className="text-[10px] font-medium" style={{ color: isUserOnline(driver.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}>
                      {isUserOnline(driver.lastSeen) ? 'ออนไลน์' : formatRelativeTime(driver.lastSeen)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors">
                    {driver.linePublicId && (
                      <a
                        href={`https://line.me/R/ti/p/~${encodeURIComponent(driver.linePublicId)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-black/20 hover:scale-110 active:scale-95 transition-all"
                        style={{ color: '#00C300' }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    {driver.phone && (
                      <a
                        href={`tel:${driver.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-black/20 hover:scale-110 active:scale-95 transition-all text-[var(--success)]"
                      >
                        <PhoneCall className="w-4 h-4" />
                      </a>
                    )}
                    <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedPersonnel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedPersonnel(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="card-neo w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                    selectedPersonnel.status === 'pending' ? 'bg-amber-500 text-white' : 
                    !selectedPersonnel.branch ? 'bg-blue-500 text-white' : 'bg-[var(--accent)] text-white'
                  }`}>
                    {selectedPersonnel.status === 'pending' ? <CheckCircle2 className="w-5 h-5" /> : 
                     !selectedPersonnel.branch ? <MapPin className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-fluid-lg font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {selectedPersonnel.status === 'pending' ? 'Step 1: อนุมัติพนักงาน' : 
                       !selectedPersonnel.branch ? 'Step 2: ระบุสาขา' : 'Step 3: ข้อมูลพนักงาน'}
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                      {selectedPersonnel.status === 'pending' ? 'Activate New Employee' : 
                       !selectedPersonnel.branch ? 'Assign Branch' : 'Manage Employee Details'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedPersonnel(null)} className="btn-ghost w-8 h-8 p-0 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <form onSubmit={handleUpdateDriver} className="space-y-4">
                {/* Avatar Preview Section */}
                <div className="flex flex-col items-center justify-center p-4 bg-[var(--bg-inset)] rounded-2xl border border-[var(--border)] mb-2">
                  <UserAvatar
                    imageUrl={selectedPersonnel.lineProfileImage}
                    displayName={selectedPersonnel.name || selectedPersonnel.lineDisplayName}
                    tier={selectedPersonnel.performanceTier}
                    size="lg"
                    showTierBadge
                  />
                  <p className="mt-2 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">{selectedPersonnel.lineDisplayName || 'New Driver'}</p>
                </div>

                {/* STEP 1: PENDING STATE */}
                {selectedPersonnel.status === 'pending' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                      <p className="text-xs font-bold text-amber-500 leading-relaxed">
                        พนักงานใหม่รอการยืนยันตัวตนเข้าระบบ ITL <br/> กรุณาตรวจสอบและกดยืนยันด้านล่าง
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updateData: any = { status: 'active' };
                          if (role === 'leader') {
                             updateData.role = 'driver';
                             updateData.branch = user?.branch;
                          }
                          handleActivate(selectedPersonnel._id, updateData);
                        }}
                        disabled={actionLoading === selectedPersonnel._id}
                        className="btn flex-1 h-14 text-sm font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-emerald-500/10"
                        style={{ background: 'var(--success)', color: 'white' }}
                      >
                        {actionLoading === selectedPersonnel._id ? 'กำลัง...' : '1. ยืนยันพนักงาน'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeletingId(selectedPersonnel._id); setShowDeleteModal(true); }}
                        disabled={actionLoading === selectedPersonnel._id}
                        className="btn px-4 h-14 text-sm font-bold disabled:opacity-50"
                        style={{ background: 'var(--danger)', color: 'white' }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* STEP 2: ASSIGN BRANCH & ROLE */}
                    {!selectedPersonnel.branch ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                          {role === 'admin' ? (
                            <div>
                              <label className="block text-fluid-xs font-black uppercase tracking-widest mb-1 text-blue-500">2. เลือกตําแหน่งงาน (Role)</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPersonnel({ ...selectedPersonnel, role: 'driver' })}
                                  className={`py-2 rounded-lg text-xs font-black transition-all ${selectedPersonnel.role === 'driver' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/50 text-blue-500 border border-blue-500/20'}`}
                                >
                                  DRIVER
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPersonnel({ ...selectedPersonnel, role: 'leader' })}
                                  className={`py-2 rounded-lg text-xs font-black transition-all ${selectedPersonnel.role === 'leader' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/50 text-blue-500 border border-blue-500/20'}`}
                                >
                                  LEADER
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                              <p className="text-[10px] font-black text-blue-500 uppercase">ตำแหน่งงาน: DRIVER (พนักงานขับรถ)</p>
                              <p className="text-[9px] text-blue-500/70">สิทธิ์ Leader จะเปิดใช้งาน Driver ได้เท่านั้น</p>
                            </div>
                          )}
                          <div>
                            <label className="block text-fluid-xs font-black uppercase tracking-widest mb-1 text-blue-500">3. เลือกสาขาที่สังกัด</label>
                            {role === 'admin' ? (
                              <select
                                value={selectedPersonnel.branch || ''}
                                onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, branch: e.target.value || undefined })}
                                className="input border-blue-500/30 bg-blue-500/5 focus:border-blue-500"
                                required
                              >
                                <option value="">-- ระบุสาขา --</option>
                                {(branchesLoading ? [] : branches).map(b => (
                                  <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="input border-blue-500/30 bg-blue-500/20 flex items-center px-3 text-sm font-bold text-blue-600">
                                สาขา {user?.branch} (ตามสิทธิ์ผู้ดูแล)
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          type="submit" 
                          disabled={!selectedPersonnel.branch || actionLoading === selectedPersonnel._id} 
                          className="btn btn-primary w-full h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/10"
                        >
                          {actionLoading === selectedPersonnel._id ? 'กำลัง...' : 'บันทึกและเปิดใช้งาน'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(selectedPersonnel._id)}
                          className="btn btn-ghost w-full text-[10px] uppercase font-black tracking-widest opacity-50"
                        >
                          ย้อนกลับไปรออนุมัติ (Deactivate)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {role === 'admin' && (
                          <div className="pt-1">
                            <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                              ตําแหน่งงาน (Role)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedPersonnel({ ...selectedPersonnel, role: 'driver' } as any)}
                                className={`py-2 rounded-lg text-xs font-black transition-all ${selectedPersonnel.role === 'driver' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]'}`}
                              >
                                DRIVER
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedPersonnel({ ...selectedPersonnel, role: 'leader' } as any)}
                                className={`py-2 rounded-lg text-xs font-black transition-all ${selectedPersonnel.role === 'leader' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)]'}`}
                              >
                                LEADER
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tier selector */}
                        <div className="pt-1">
                          <label className="flex items-center gap-1.5 text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                            <Shield className="w-3.5 h-3.5" />
                            Avatar Frame
                          </label>
                          <div className="grid grid-cols-5 gap-2">
                            {PERFORMANCE_TIERS.map((tier) => {
                              const cfg = PERFORMANCE_TIER_CONFIG[tier];
                              const isSelected = (selectedPersonnel.performanceTier ?? 'standard') === tier;
                              return (
                                <button
                                  key={tier}
                                  type="button"
                                  onClick={() => setSelectedPersonnel({ ...selectedPersonnel, performanceTier: tier })}
                                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-[var(--radius-md)] transition-all"
                                  style={{
                                    background: isSelected ? 'var(--bg-inset)' : 'transparent',
                                    border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                                  }}
                                >
                                  <UserAvatar
                                    imageUrl={selectedPersonnel.lineProfileImage}
                                    displayName={selectedPersonnel.name || selectedPersonnel.lineDisplayName}
                                    tier={tier}
                                    size="xs"
                                  />
                                  <span className="text-[10px] font-medium leading-none" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                                    {cfg.label.split(' ')[0]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>ชื่อ</label>
                            <input type="text" value={selectedPersonnel.name || ''} onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, name: e.target.value })} className="input" placeholder="กรอกชื่อ" required />
                          </div>
                          <div>
                            <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>นามสกุล</label>
                            <input type="text" value={selectedPersonnel.surname || ''} onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, surname: e.target.value })} className="input" placeholder="กรอกนามสกุล" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>รหัสพนักงาน</label>
                            <input type="text" value={selectedPersonnel.employeeId || ''} onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, employeeId: e.target.value })} className="input" placeholder="กรอกรหัส" />
                          </div>
                          <div>
                            <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>เบอร์โทร</label>
                            <input type="tel" value={selectedPersonnel.phone || ''} onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, phone: e.target.value })} className="input" placeholder="08x-xxxxxxx" />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>ปรับเปลี่ยนสาขา</label>
                          <select
                            value={selectedPersonnel.branch || ''}
                            onChange={(e) => setSelectedPersonnel({ ...selectedPersonnel, branch: e.target.value })}
                            className="input"
                            required
                          >
                            {(branchesLoading ? [] : branches).map(b => (
                              <option key={b.code} value={b.code}>{b.code}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setSelectedPersonnel(null)} className="btn btn-secondary flex-1">ยกเลิก</button>
                          <button type="submit" disabled={actionLoading === selectedPersonnel._id} className="btn btn-primary flex-1 h-12 shadow-lg shadow-[var(--accent)]/10">
                            {actionLoading === selectedPersonnel._id ? 'กำลัง...' : '3. บันทึกข้อมูล'}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeactivate(selectedPersonnel._id)}
                          disabled={actionLoading === selectedPersonnel._id}
                          className="btn btn-ghost w-full text-[10px] uppercase font-black tracking-widest mt-2"
                          style={{ color: 'var(--warning)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          ระงับการใช้งานพนักงาน (Deactivate)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 className="w-7 h-7" style={{ color: 'var(--danger)' }} />
                </div>
                <h3 className="text-fluid-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>ลบพนักงาน</h3>
                <p className="text-fluid-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  ต้องการลบพนักงานคนนี้ใช่หรือไม่?<br/>
                  การลบจะทำให้ข้อมูลการลาและบันทึกแทนหายไปด้วย
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(false)} 
                    className="btn btn-secondary flex-1"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleDeleteDriver} 
                    disabled={actionLoading !== null}
                    className="btn flex-1"
                    style={{ background: 'var(--danger)', color: 'white' }}
                  >
                    {actionLoading ? 'กำลังลบ...' : 'ลบ'}
                  </button>
                </div>
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

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

export default function DriverManagementPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DriverManagementContent />
    </Suspense>
  );
}



