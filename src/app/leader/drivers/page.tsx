'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, CheckCircle2, AlertCircle, X, Trash2, Shield } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { PERFORMANCE_TIERS, PERFORMANCE_TIER_CONFIG, type PerformanceTier } from '@/lib/profile-tier';
import { formatDateThai, formatRelativeTime, isUserOnline } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useToast } from '@/components/Toast';

interface Driver {
  _id: string;
  lineUserId: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: PerformanceTier;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status: 'pending' | 'active';
  vacationDays: number;
  sickDays: number;
  personalDays: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
}

function DriverManagementContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const drivers = activeTab === 'all' 
    ? allDrivers 
    : allDrivers.filter(d => d.status === activeTab);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) {
      router.push('/leader/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setAllDrivers(data.users);
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
  }, [user]);

  const { showToast } = useToast();

  // Pusher realtime — driver list auto-refresh
  const handleDriverChanged = useCallback(() => {
    fetchDrivers();
  }, []);

  const handleNewDriver = useCallback((data: { displayName?: string }) => {
    fetchDrivers();
    showToast('notification', `พนักงานใหม่ลงทะเบียน: ${data?.displayName || 'พนักงาน'}`);
  }, [showToast]);

  usePusher('users', [
    { event: 'new-driver', callback: handleNewDriver },
    { event: 'driver-activated', callback: handleDriverChanged },
    { event: 'driver-updated', callback: handleDriverChanged },
    { event: 'driver-deleted', callback: handleDriverChanged },
  ], !!user);

  const handleActivate = async (driverId: string) => {
    setActionLoading(driverId);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: driverId, status: 'active' }),
      });
      const data = await response.json();
      if (data.success) {
        setAllDrivers(prev => prev.map(d => d._id === driverId ? { ...d, status: 'active' } : d));
        setSelectedDriver(null);
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
        setAllDrivers(prev => prev.map(d => d._id === driverId ? { ...d, status: 'pending' } : d));
        setSelectedDriver(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    
    setActionLoading(selectedDriver._id);
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedDriver._id,
          name: selectedDriver.name,
          surname: selectedDriver.surname,
          phone: selectedDriver.phone,
          employeeId: selectedDriver.employeeId,
          vacationDays: selectedDriver.vacationDays,
          sickDays: selectedDriver.sickDays,
          personalDays: selectedDriver.personalDays,
          performanceTier: selectedDriver.performanceTier,
          branch: selectedDriver.branch,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAllDrivers(prev => prev.map(d => d._id === selectedDriver._id ? { ...d, ...data.user } : d));
        setSelectedDriver(null);
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
        setAllDrivers(prev => prev.filter(d => d._id !== deletingId));
        setShowDeleteModal(false);
        setDeletingId(null);
        setSelectedDriver(null);
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
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="จัดการพนักงาน" subtitle="เพิ่ม/แก้ไข/เปิดใช้งานพนักงาน" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">

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
            <p className="text-fluid-2xl font-extrabold" style={{ color: activeTab === 'all' ? 'white' : 'var(--accent)' }}>{allDrivers.length}</p>
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
            <p className="text-fluid-2xl font-extrabold" style={{ color: activeTab === 'pending' ? 'white' : 'var(--warning)' }}>
              {drivers.filter(d => d.status === 'pending').length}
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
            <p className="text-fluid-2xl font-extrabold" style={{ color: activeTab === 'active' ? 'white' : 'var(--success)' }}>
              {drivers.filter(d => d.status === 'active').length}
            </p>
            <p className="text-fluid-xs" style={{ color: activeTab === 'active' ? 'white' : 'var(--text-muted)' }}>พร้อมใช้</p>
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : drivers.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ไม่มีพนักงาน</p>
            </div>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver) => (
                <motion.div
                  key={driver._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedDriver(driver)}
                  className="card p-4 flex items-center gap-3 cursor-pointer"
                >
                  <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                    <UserAvatar
                      imageUrl={driver.lineProfileImage}
                      displayName={driver.name || driver.lineDisplayName}
                      tier={driver.performanceTier}
                      size="sm"
                      onClick={() => { setProfileUser(driver as unknown as ProfileUser); setShowProfile(true); }}
                    />
                    {/* Online dot */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        background: isUserOnline(driver.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
                        borderColor: 'var(--bg-surface)',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {driver.employeeId ? `${driver.employeeId} - ` : ''}
                      {driver.name && driver.surname ? `${driver.name} ${driver.surname}` : driver.lineDisplayName}
                    </p>
                    {driver.branch && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{driver.branch}</span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: isUserOnline(driver.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}
                      >
                        {isUserOnline(driver.lastSeen) ? 'ออนไลน์' : formatRelativeTime(driver.lastSeen)}
                      </span>
                    </div>
                    {driver.phone && (
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {driver.phone}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${driver.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                    {driver.status === 'active' ? 'พร้อมใช้' : 'รอยืนยัน'}
                  </span>
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
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSelectedDriver(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="card-neo w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>แก้ไขข้อมูล</h2>
                <button onClick={() => setSelectedDriver(null)} className="btn-ghost w-8 h-8 p-0 rounded-full flex items-center justify-center">
                  <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <form onSubmit={handleUpdateDriver} className="space-y-3">
                {/* Avatar preview */}
                <div className="flex justify-center pb-1">
                  <UserAvatar
                    imageUrl={selectedDriver.lineProfileImage}
                    displayName={selectedDriver.name || selectedDriver.lineDisplayName}
                    tier={selectedDriver.performanceTier}
                    size="xl"
                    showTierBadge
                  />
                </div>

                {/* Tier selector */}
                <div className="pt-1">
                  <label className="flex items-center gap-1.5 text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    <Shield className="w-3.5 h-3.5" />
                    Avatar Frame
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PERFORMANCE_TIERS.map((tier) => {
                      const cfg = PERFORMANCE_TIER_CONFIG[tier];
                      const isSelected = (selectedDriver.performanceTier ?? 'standard') === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setSelectedDriver({ ...selectedDriver, performanceTier: tier })}
                          className="flex flex-col items-center gap-1 py-2 px-1 rounded-[var(--radius-md)] transition-all"
                          style={{
                            background: isSelected ? 'var(--bg-inset)' : 'transparent',
                            border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                        >
                          <UserAvatar
                            imageUrl={selectedDriver.lineProfileImage}
                            displayName={selectedDriver.name || selectedDriver.lineDisplayName}
                            tier={tier}
                            size="xs"
                          />
                          <span className="text-[10px] font-medium leading-none" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>ชื่อ</label>
                    <input type="text" value={selectedDriver.name || ''} onChange={(e) => setSelectedDriver({ ...selectedDriver, name: e.target.value })} className="input" placeholder="กรอกชื่อ" required />
                  </div>
                  <div>
                    <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>นามสกุล</label>
                    <input type="text" value={selectedDriver.surname || ''} onChange={(e) => setSelectedDriver({ ...selectedDriver, surname: e.target.value })} className="input" placeholder="กรอกนามสกุล" required />
                  </div>
                </div>
                <div>
                  <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>รหัสพนักงาน</label>
                  <input type="text" value={selectedDriver.employeeId || ''} onChange={(e) => setSelectedDriver({ ...selectedDriver, employeeId: e.target.value })} className="input" placeholder="กรอกรหัสพนักงาน" />
                </div>
                <div>
                  <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>เบอร์โทร</label>
                  <input type="tel" value={selectedDriver.phone || ''} onChange={(e) => setSelectedDriver({ ...selectedDriver, phone: e.target.value })} className="input" placeholder="กรอกเบอร์โทร" />
                </div>

                <div>
                  <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>สาขา</label>
                  <select
                    value={selectedDriver.branch || ''}
                    onChange={(e) => setSelectedDriver({ ...selectedDriver, branch: e.target.value || undefined })}
                    className="input"
                  >
                    <option value="">-- เลือกสาขา --</option>
                    <option value="AYA">AYA</option>
                    <option value="CBI">CBI</option>
                    <option value="KSN">KSN</option>
                    <option value="RA2">RA2</option>
                    <option value="BBT">BBT</option>
                  </select>
                </div>

                <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>วันลาคงเหลือ</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-fluid-xs mb-1" style={{ color: 'var(--accent)' }}>พักร้อน</label>
                      <input type="number" min="0" value={selectedDriver.vacationDays ?? 10} onChange={(e) => setSelectedDriver({ ...selectedDriver, vacationDays: parseInt(e.target.value) || 0 })} className="input text-center" />
                    </div>
                    <div>
                      <label className="block text-fluid-xs mb-1" style={{ color: 'var(--danger)' }}>ลาป่วย</label>
                      <input type="number" min="0" value={selectedDriver.sickDays ?? 10} onChange={(e) => setSelectedDriver({ ...selectedDriver, sickDays: parseInt(e.target.value) || 0 })} className="input text-center" />
                    </div>
                    <div>
                      <label className="block text-fluid-xs mb-1" style={{ color: 'var(--success)' }}>ลากิจ</label>
                      <input type="number" min="0" value={selectedDriver.personalDays ?? 5} onChange={(e) => setSelectedDriver({ ...selectedDriver, personalDays: parseInt(e.target.value) || 0 })} className="input text-center" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setSelectedDriver(null)} className="btn btn-secondary flex-1">ยกเลิก</button>
                  <button type="submit" disabled={actionLoading === selectedDriver._id} className="btn btn-primary flex-1">
                    {actionLoading === selectedDriver._id ? 'กำลัง...' : 'บันทึก'}
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                {selectedDriver.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActivate(selectedDriver._id)}
                      disabled={actionLoading === selectedDriver._id}
                      className="btn flex-1 text-fluid-sm font-semibold disabled:opacity-50"
                      style={{ background: 'var(--success)', color: 'white' }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading === selectedDriver._id ? 'กำลัง...' : 'เปิดใช้งาน'}
                    </button>
                    <button
                      onClick={() => { setDeletingId(selectedDriver._id); setShowDeleteModal(true); }}
                      disabled={actionLoading === selectedDriver._id}
                      className="btn flex-1 text-fluid-sm font-semibold disabled:opacity-50"
                      style={{ background: 'var(--danger)', color: 'white' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      ลบ
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeactivate(selectedDriver._id)}
                    disabled={actionLoading === selectedDriver._id}
                    className="btn btn-ghost w-full text-fluid-sm disabled:opacity-50"
                    style={{ color: 'var(--warning)' }}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {actionLoading === selectedDriver._id ? 'กำลัง...' : 'ระงับการใช้งาน'}
                  </button>
                )}
              </div>
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
              className="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 className="w-7 h-7" style={{ color: 'var(--danger)' }} />
                </div>
                <h3 className="text-fluid-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>ลบพนักงาน</h3>
                <p className="text-fluid-sm mb-6" style={{ color: 'var(--text-muted)' }}>
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



