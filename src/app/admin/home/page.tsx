<<<<<<< D:/projects/ITL/drivers/src/app/admin/home/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home, CalendarDays, Users, Rss, User, CheckSquare, ClipboardCheck, Settings, Shield, Clock, MapPin, ChevronRight, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';

const menuItems = [
  // Operations
  { icon: CheckSquare, label: 'อนุมัติการลา', sub: 'ตรวจสอบคำขอลาจากทุกสาขา', href: '/leader/approve', color: 'var(--success)' },
  { icon: Clock, label: 'ตรวจสอบลงเวลา', sub: 'ดูประวัติการเข้า-ออกงานพนักงาน', href: '/admin/attendance', color: 'var(--accent)' },
  
  // Resources
  { icon: Users, label: 'จัดการพนักงาน', sub: 'ดู/เพิ่ม/แก้ไขข้อมูลพนักงานทุกสาขา', href: '/leader/drivers', color: 'var(--accent)' },
  { icon: MapPin, label: 'จัดการสาขา', sub: 'กำหนดพิกัด แผนที่ และรัศมีสาขา', href: '/admin/branches', color: 'var(--info)' },
  
  // Monitoring
  { icon: CalendarDays, label: 'ภาพรวมระบบ', sub: 'Dashboard ตารางวันลาและสถิติ', href: '/dashboard', color: 'var(--warning)' },
  { icon: ClipboardCheck, label: 'งานมอบหมาย (Tasks)', sub: 'สร้างงานหรือแบบทดสอบให้พนักงาน', href: '/leader/tasks', color: 'var(--info)' },
  
  // History & Support
  { icon: Clock, label: 'ประวัติทั้งหมด', sub: 'สืบค้นประวัติย้อนหลังทุกประเภท', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: User, label: 'ตั้งค่าบัญชีระบบ', sub: 'จัดการโปรไฟล์และรหัสผ่าน', href: '/leader/settings', color: 'var(--text-muted)' },
];

export default function AdminHomePage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingDriverCount, setPendingDriverCount] = useState(0);
  const [leaderCount, setLeaderCount] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          if (data.user.role !== 'admin') {
            router.push('/leader/home');
            return;
          }
          setUser(data.user);
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchCounts = async () => {
    try {
      // Admin sees all - no branch filter
      const res = await fetch('/api/counts?type=all');
      const data = await res.json();
      if (data.success) {
        setPendingLeaveCount(data.counts.pendingLeaves);
        setPendingDriverCount(data.counts.pendingDrivers);
      }
      
      // Count leaders
      const leaderRes = await fetch('/api/leaders');
      const leaderData = await leaderRes.json();
      if (leaderData.success) {
        setLeaderCount(leaderData.leaders?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCounts();
  }, [user]);

  // Pusher realtime — update badge counts
  const refetchCounts = useCallback(async () => {
    fetchCounts();
  }, []);

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'new-leave-request', callback: refetchCounts },
      { event: 'leave-status-changed', callback: refetchCounts },
      { event: 'leave-cancelled', callback: refetchCounts },
    ]},
    { channel: 'users', bindings: [
      { event: 'new-driver', callback: refetchCounts },
      { event: 'driver-activated', callback: refetchCounts },
      { event: 'driver-deleted', callback: refetchCounts },
    ]},
  ], !!user);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/leader/login');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      {/* Admin Banner */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-2" style={{ background: 'linear-gradient(135deg, #002B5B 0%, #1a4a7a 100%)', color: 'white' }}>
        <Shield className="w-4 h-4" />
        <span className="text-fluid-xs font-semibold">Superuser Mode</span>
      </div>

      <div className="lg:pl-[240px] pb-20 lg:pb-6 pt-10 lg:pt-0">
        <div className="px-4 lg:px-8 py-6">
          {/* Welcome */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6"
          >
            <h1 className="text-fluid-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              สวัสดี, {user.name || 'Admin'} 👋
            </h1>
            <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
              จัดการระบบ ITL Leave Management
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--warning)' }}>{pendingLeaveCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>รออนุมัติลา</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--accent)' }}>{pendingDriverCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>พนักงานใหม่</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--success)' }}>{leaderCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>Leaders</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--info)' }}>{branchesLoading ? '...' : branches.length}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>สาขา</div>
            </div>
          </motion.div>

          {/* Branch Quick View */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>สาขาทั้งหมด</h2>
            {branchesLoading ? (
              <div style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</div>
            ) : (
              <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {branches.map(b => (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBranch(b.code)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b.code ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b.code}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.href}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => router.push(item.href)}
                  className="card p-4 text-left flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg shrink-0" style={{ background: `${item.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                    <div className="text-fluid-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                </motion.button>
              );
            })}
          </div>

          {/* Logout */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleLogout}
            className="w-full card p-4 flex items-center justify-center gap-2 mt-6"
            style={{ border: '1px solid var(--danger)' }}
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="text-fluid-sm font-semibold" style={{ color: 'var(--danger)' }}>ออกจากระบบ</span>
          </motion.button>
        </div>
      </div>

      <BottomNav role="admin" />
    </div>
  );
}
=======
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Home, CalendarDays, Users, Rss, User, CheckSquare, ClipboardCheck, Settings, Shield, Clock, MapPin, ChevronRight, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';

const menuItems = [
  // Operations
  { icon: CheckSquare, label: 'อนุมัติการลา', sub: 'ตรวจสอบคำขอลาจากทุกสาขา', href: '/leader/approve', color: 'var(--success)' },
  { icon: Clock, label: 'ตรวจสอบลงเวลา', sub: 'ดูประวัติการเข้า-ออกงานพนักงาน', href: '/admin/attendance', color: 'var(--accent)' },
  
  // Resources
  { icon: Users, label: 'จัดการพนักงาน', sub: 'ดู/เพิ่ม/แก้ไขข้อมูลพนักงานทุกสาขา', href: '/leader/drivers', color: 'var(--accent)' },
  { icon: MapPin, label: 'จัดการสาขา', sub: 'กำหนดพิกัด แผนที่ และรัศมีสาขา', href: '/admin/branches', color: 'var(--info)' },
  
  // Monitoring
  { icon: CalendarDays, label: 'ภาพรวมระบบ', sub: 'Dashboard ตารางวันลาและสถิติ', href: '/dashboard', color: 'var(--warning)' },
  { icon: ClipboardCheck, label: 'งานมอบหมาย (Tasks)', sub: 'สร้างงานหรือแบบทดสอบให้พนักงาน', href: '/leader/tasks', color: 'var(--info)' },
  
  // History & Support
  { icon: Clock, label: 'ประวัติทั้งหมด', sub: 'สืบค้นประวัติย้อนหลังทุกประเภท', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: User, label: 'ตั้งค่าบัญชีระบบ', sub: 'จัดการโปรไฟล์และรหัสผ่าน', href: '/leader/settings', color: 'var(--text-muted)' },
];

export default function AdminHomePage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingDriverCount, setPendingDriverCount] = useState(0);
  const [leaderCount, setLeaderCount] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          if (data.user.role !== 'admin') {
            router.push('/leader/home');
            return;
          }
          setUser(data.user);
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchCounts = async () => {
    try {
      // Admin sees all - no branch filter
      const res = await fetch('/api/counts?type=all');
      const data = await res.json();
      if (data.success) {
        setPendingLeaveCount(data.counts.pendingLeaves);
        setPendingDriverCount(data.counts.pendingDrivers);
      }
      
      // Count leaders
      const leaderRes = await fetch('/api/leaders');
      const leaderData = await leaderRes.json();
      if (leaderData.success) {
        setLeaderCount(leaderData.leaders?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCounts();
  }, [user]);

  // Pusher realtime — update badge counts
  const refetchCounts = useCallback(async () => {
    fetchCounts();
  }, []);

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'new-leave-request', callback: refetchCounts },
      { event: 'leave-status-changed', callback: refetchCounts },
      { event: 'leave-cancelled', callback: refetchCounts },
    ]},
    { channel: 'users', bindings: [
      { event: 'new-driver', callback: refetchCounts },
      { event: 'driver-activated', callback: refetchCounts },
      { event: 'driver-deleted', callback: refetchCounts },
    ]},
  ], !!user);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/leader/login');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      {/* Admin Banner */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-2" style={{ background: 'linear-gradient(135deg, #002B5B 0%, #1a4a7a 100%)', color: 'white' }}>
        <Shield className="w-4 h-4" />
        <span className="text-fluid-xs font-semibold">Superuser Mode</span>
      </div>

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6 pt-10 lg:pt-0">
        <div className="px-4 lg:px-8 py-6">
          {/* Welcome */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-6"
          >
            <h1 className="text-fluid-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              สวัสดี, {user.name || 'Admin'} 👋
            </h1>
            <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
              จัดการระบบ ITL Leave Management
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
          >
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--warning)' }}>{pendingLeaveCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>รออนุมัติลา</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--accent)' }}>{pendingDriverCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>พนักงานใหม่</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--success)' }}>{leaderCount}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>Leaders</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-fluid-2xl font-bold" style={{ color: 'var(--info)' }}>{branchesLoading ? '...' : branches.length}</div>
              <div className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>สาขา</div>
            </div>
          </motion.div>

          {/* Branch Quick View */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="text-fluid-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>สาขาทั้งหมด</h2>
            {branchesLoading ? (
              <div style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</div>
            ) : (
              <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {branches.map(b => (
                  <button
                    key={b.code}
                    onClick={() => setSelectedBranch(b.code)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b.code ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b.code}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.href}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  onClick={() => router.push(item.href)}
                  className="card p-4 text-left flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg shrink-0" style={{ background: `${item.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</div>
                    <div className="text-fluid-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                </motion.button>
              );
            })}
          </div>

          {/* Logout */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleLogout}
            className="w-full card p-4 flex items-center justify-center gap-2 mt-6"
            style={{ border: '1px solid var(--danger)' }}
          >
            <LogOut className="w-4 h-4" style={{ color: 'var(--danger)' }} />
            <span className="text-fluid-sm font-semibold" style={{ color: 'var(--danger)' }}>ออกจากระบบ</span>
          </motion.button>
        </div>
      </div>

      <BottomNav role="admin" />
    </div>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/admin/home/page.tsx
