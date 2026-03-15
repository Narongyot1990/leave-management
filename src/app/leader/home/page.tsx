'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, PenSquare, CalendarDays, Clock, User, ChevronRight, LogOut, ClipboardCheck, Settings } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useForceLogout } from '@/hooks/useForceLogout';
import { performLogout } from '@/lib/logout';

interface LeaderUser {
  id: string;
  name: string;
  email: string;
}

const menuItems = [
  // Primary Actions
  { icon: Clock, label: 'ลงเวลาทำงาน', sub: 'บันทึกเวลาเข้า-ออกงานปัจจุบัน', href: '/leader/attendance', color: 'var(--accent)' },
  { icon: CheckSquare, label: 'อนุมัติการลา', sub: 'จัดการคำขอลาพักผ่อนของพนักงาน', href: '/leader/approve', color: 'var(--success)' },
  { icon: ClipboardCheck, label: 'งานมอบหมาย (Tasks)', sub: 'ส่งงานหรือข้อสอบให้พนักงาน', href: '/leader/tasks', color: 'var(--info)' },
  
  // Team Management
  { icon: Users, label: 'รายชื่อพนักงาน', sub: 'จัดการพนักงานในความดูแล', href: '/leader/drivers', color: 'var(--accent)' },
  { icon: Clock, label: 'ประวัติการลงเวลา', sub: 'ดูบันทึกย้อนหลังของสาขา', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: PenSquare, label: 'บันทึกการแทนงาน', sub: 'จัดเก็บข้อมูลการทำงานแทนกัน', href: '/leader/substitute', color: 'var(--info)' },
  
  // System & Overview
  { icon: CalendarDays, label: 'ภาพรวม Dashboard', sub: 'ตารางวันลาและสถานะสาขา', href: '/dashboard', color: 'var(--warning)' },
  { icon: User, label: 'แก้ไขข้อมูลส่วนตัว', sub: 'อัปเดตโปรไฟล์และรูปภาพ', href: '/leader/profile-edit', color: 'var(--danger)' },
  { icon: Settings, label: 'ตั้งค่าระบบ', sub: 'ข้อมูลสาขาและการตั้งค่าทั่วไป', href: '/leader/settings', color: 'var(--text-muted)' },
];

const MenuCard = ({ item, i, compact = false, pendingLeaveCount = 0, pendingDriverCount = 0 }: any) => {
  const router = useRouter();
  const Icon = item.icon;
  const isApprove = item.href === '/leader/approve';
  const isDrivers = item.href === '/leader/drivers';
  const badgeCount = isApprove ? pendingLeaveCount : isDrivers ? pendingDriverCount : 0;

  return (
    <motion.button
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 + i * 0.05 }}
      onClick={() => router.push(item.href)}
      whileTap={{ scale: 0.98 }}
      className={`card w-full flex items-center gap-3 group cursor-pointer relative overflow-hidden ${compact ? 'p-2.5' : 'p-3'}`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 opacity-30 -mr-8 -mt-8 rotate-45" />
      
      {badgeCount > 0 && (
        <span className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--danger)] text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-[var(--bg-surface)]"
          style={{ zIndex: 10 }}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}

      <div
        className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)] transition-colors group-hover:border-[var(--accent)]`}
        style={{ background: 'var(--bg-inset)' }}
      >
        <Icon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} style={{ color: item.color }} strokeWidth={2} />
      </div>

      <div className="flex-1 text-left min-w-0">
        <span className={`${compact ? 'text-[10px]' : 'text-fluid-xs'} font-black block leading-tight truncate`} style={{ color: 'var(--text-primary)' }}>
          {item.label}
        </span>
        {!compact && <span className="text-[9px] font-medium block truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</span>}
      </div>
      {!compact && <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 opacity-30" />}
    </motion.button>
  );
};

const BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];

export default function LeaderHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingDriverCount, setPendingDriverCount] = useState(0);
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
      let url = '/api/counts?type=all';
      if (role === 'admin' && selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      } else if (role === 'leader' && user?.branch) {
        url += `&branch=${user.branch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPendingLeaveCount(data.counts.pendingLeaves);
        setPendingDriverCount(data.counts.pendingDrivers);
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchCounts();
  }, [user, role, selectedBranch]);

  // Pusher realtime — update badge counts
  const refetchCounts = useCallback(async () => {
    fetchCounts();
  }, [role, selectedBranch, user]);

  // Auto-logout when admin changes role/status
  useForceLogout(user?.id, role);

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
    const loginPath = await performLogout(role);
    router.push(loginPath);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-4 pb-1">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold"
                    style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  {user.status === 'active' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{ background: 'var(--success)', border: '2px solid var(--bg-base)' }} />
                  )}
                </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</h1>
                <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                  {role === 'admin' ? 'ผู้ดูแลระบบ (ทุกสาขา)' : `หัวหน้างาน (สาขา ${user.branch || '-'})`}
                </p>
              </div>
              <ThemeToggle />
            </motion.div>
          </div>
        </header>

        <div className="px-4 lg:px-8 py-2">
          <div className="max-w-3xl mx-auto space-y-3">
            
            {/* Pending Status */}
            {user.status === 'pending' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="card p-5 text-center"
                style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--warning)' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--warning-light)' }}>
                  <CheckSquare className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                </div>
                <p className="text-fluid-sm font-semibold" style={{ color: 'var(--warning)' }}>บัญชีอยู่ระหว่างตรวจสอบ</p>
                <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>กรุณารอผู้ดูแลระบบอนุมัติการใช้งาน Leader</p>
              </motion.div>
            )}

            {/* Branch Filter for Admin */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {BRANCHES.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Dashboard Sections */}
            <div className="space-y-5">
              {/* Operations Group */}
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>งานบริหาร (Operations)</h2>
                  <div className="h-[1px] flex-1 ml-4 bg-gradient-to-r from-[var(--border)] to-transparent opacity-50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {menuItems.slice(0, 3).map((item, i) => (
                    <MenuCard key={item.label} item={item} i={i} pendingLeaveCount={pendingLeaveCount} pendingDriverCount={pendingDriverCount} />
                  ))}
                </div>
              </section>

              {/* Monitoring & Tracking */}
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>การติดตาม (Monitoring)</h2>
                  <div className="h-[1px] flex-1 ml-4 bg-gradient-to-r from-[var(--border)] to-transparent opacity-50" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {menuItems.slice(3, 6).map((item, i) => (
                    <MenuCard key={item.label} item={item} i={i} compact />
                  ))}
                </div>
              </section>

              {/* Account & Settings */}
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>บัญชีและตั้งค่า (Account)</h2>
                  <div className="h-[1px] flex-1 ml-4 bg-gradient-to-r from-[var(--border)] to-transparent opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {menuItems.slice(6).map((item, i) => (
                    <MenuCard key={item.label} item={item} i={i} />
                  ))}
                </div>
              </section>
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="btn btn-ghost w-full lg:hidden mt-4"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </motion.button>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
