'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, Clock, CalendarDays, ClipboardCheck, PenSquare, Settings, Rss, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useForceLogout } from '@/hooks/useForceLogout';
import { performLogout } from '@/lib/logout';

const menu = [
  { icon: Clock, label: 'ลงเวลา', href: '/leader/attendance', color: 'var(--accent)' },
  { icon: CheckSquare, label: 'อนุมัติลา', href: '/leader/approve', color: 'var(--success)', badge: 'leave' },
  { icon: ClipboardCheck, label: 'มอบหมาย', href: '/leader/tasks', color: 'var(--info)' },
  { icon: Users, label: 'พนักงาน', href: '/leader/drivers', color: 'var(--accent)', badge: 'driver' },
  { icon: Rss, label: 'Moments', href: '/leader/car-wash', color: 'var(--info)' },
  { icon: CalendarDays, label: 'Dashboard', href: '/dashboard', color: 'var(--warning)' },
  { icon: PenSquare, label: 'แทนงาน', href: '/leader/substitute', color: 'var(--info)' },
  { icon: Clock, label: 'ประวัติ', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: Settings, label: 'ตั้งค่า', href: '/leader/settings', color: 'var(--text-muted)' },
];

export default function LeaderHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingDriver, setPendingDriver] = useState(0);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchCounts = useCallback(async () => {
    try {
      let url = '/api/counts?type=all';
      if (role === 'leader' && user?.branch) url += `&branch=${user.branch}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPendingLeave(data.counts.pendingLeaves);
        setPendingDriver(data.counts.pendingDrivers);
      }
    } catch { /* ignore */ }
  }, [role, user]);

  useEffect(() => { if (user) fetchCounts(); }, [user, fetchCounts]);

  useForceLogout(user?.id || user?._id, 'leader');

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'new-leave-request', callback: fetchCounts },
      { event: 'leave-status-changed', callback: fetchCounts },
      { event: 'leave-cancelled', callback: fetchCounts },
    ]},
    { channel: 'users', bindings: [
      { event: 'new-driver', callback: fetchCounts },
      { event: 'driver-activated', callback: fetchCounts },
      { event: 'driver-deleted', callback: fetchCounts },
    ]},
  ], !!user);

  const handleLogout = async () => {
    const path = await performLogout('leader');
    router.push(path);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-5 pb-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--accent)' }}>
              {user.name?.charAt(0) || 'L'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</h1>
              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                {role === 'admin' ? 'ผู้ดูแลระบบ' : `หัวหน้า ${user.branch || ''}`}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="px-4 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Stat badges */}
            {(pendingLeave > 0 || pendingDriver > 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
                {pendingLeave > 0 && (
                  <button onClick={() => router.push('/leader/approve')} className="card p-3 text-center cursor-pointer">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--warning)' }}>{pendingLeave}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>รออนุมัติลา</p>
                  </button>
                )}
                {pendingDriver > 0 && (
                  <button onClick={() => router.push('/leader/drivers')} className="card p-3 text-center cursor-pointer">
                    <p className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>{pendingDriver}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>พนักงานใหม่</p>
                  </button>
                )}
              </motion.div>
            )}

            {/* Menu grid */}
            <div className="grid grid-cols-4 gap-3">
              {menu.map((m, i) => {
                const Icon = m.icon;
                const badge = m.badge === 'leave' ? pendingLeave : m.badge === 'driver' ? pendingDriver : 0;
                return (
                  <motion.button
                    key={m.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    onClick={() => router.push(m.href)}
                    whileTap={{ scale: 0.95 }}
                    className="card p-3 flex flex-col items-center gap-1.5 cursor-pointer relative"
                  >
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>
                    )}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                      <Icon className="w-[18px] h-[18px]" style={{ color: m.color }} strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] font-semibold leading-tight text-center" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Logout — bottom of page, subtle */}
            <div className="flex justify-center pb-2">
              <button
                onClick={() => { if (confirm('ต้องการออกจากระบบ?')) handleLogout(); }}
                className="flex items-center gap-1.5 text-[11px] py-2 px-5 rounded-full border transition-colors hover:bg-red-500/10"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)', opacity: 0.7 }}
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>

          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
