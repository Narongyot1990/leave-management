'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FileText, History, ClipboardCheck, Umbrella, Thermometer, Briefcase, LogOut, AlertCircle, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePusherMulti } from '@/hooks/usePusher';
import { useForceLogout } from '@/hooks/useForceLogout';
import { performLogout } from '@/lib/logout';
import type { DriverUser } from '@/lib/types';

const actions = [
  { icon: FileText, label: 'ขอลา', href: '/leave', color: 'var(--accent)' },
  { icon: History, label: 'ประวัติลา', href: '/leave/history', color: 'var(--success)' },
  { icon: ClipboardCheck, label: 'งานที่ได้รับ', href: '/tasks', color: 'var(--warning)' },
  { icon: Clock, label: 'ขอรายได้พิเศษ', href: '/ot', color: 'var(--accent)' },
  { icon: History, label: 'ประวัติรายได้พิเศษ', href: '/leave/history?tab=ot', color: 'var(--success)' },
];

export default function DriverHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.success || data.user?.role !== 'driver') {
          const storedUser = localStorage.getItem('driverUser');
          if (!storedUser) { router.push('/login'); return; }
          const userData = JSON.parse(storedUser);
          if (!userData.name || !userData.surname) { router.push('/profile-setup'); return; }
          setUser(userData);
          setLoading(false);
          return;
        }

        const userData = data.user;
        localStorage.setItem('driverUser', JSON.stringify(userData));
        if (!userData.name || !userData.surname) { router.push('/profile-setup'); return; }
        setUser(userData);
      } catch {
        const storedUser = localStorage.getItem('driverUser');
        if (!storedUser) { router.push('/login'); return; }
        setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleRefresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('driverUser', JSON.stringify(data.user));
        setUser(data.user);
      }
    } catch { /* ignore */ }
  }, []);

  useForceLogout(user?.id, 'driver');

  usePusherMulti([
    { channel: 'leave-requests', bindings: [{ event: 'leave-status-changed', callback: handleRefresh }] },
    { channel: 'tasks', bindings: [{ event: 'new-task', callback: handleRefresh }] },
  ], !!user);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  const handleLogout = async () => {
    const loginPath = await performLogout('driver');
    router.push(loginPath);
  };

  const quota = [
    { icon: Umbrella, label: 'พักร้อน', val: user.vacationDays ?? 0, color: 'var(--accent)' },
    { icon: Thermometer, label: 'ลาป่วย', val: user.sickDays ?? 0, color: 'var(--danger)' },
    { icon: Briefcase, label: 'ลากิจ', val: user.personalDays ?? 0, color: 'var(--success)' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-5 pb-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="md" />
            <div className="flex-1 min-w-0">
              <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name ? `${user.name} ${user.surname || ''}`.trim() : user.lineDisplayName}
              </h1>
              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                {user.branch ? `สาขา ${user.branch}` : 'พนักงานขับรถ'}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="px-4 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Pending */}
            {user.status === 'pending' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex items-center gap-3" style={{ borderLeft: '3px solid var(--warning)' }}>
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--warning)' }} />
                <div>
                  <p className="text-fluid-sm font-semibold" style={{ color: 'var(--warning)' }}>รอเปิดใช้งาน</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>กรุณารอหัวหน้างานอนุมัติ</p>
                </div>
              </motion.div>
            )}

            {/* Leave Quota */}
            {user.status === 'active' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3">
                {quota.map((q) => (
                  <div key={q.label} className="card p-3 text-center">
                    <q.icon className="w-5 h-5 mx-auto mb-1" style={{ color: q.color }} strokeWidth={1.8} />
                    <p className="text-2xl font-extrabold leading-none" style={{ color: q.color }}>{q.val}</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{q.label}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              {actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.button
                    key={a.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => router.push(a.href)}
                    whileTap={{ scale: 0.96 }}
                    className="card p-4 flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                      <Icon className="w-5 h-5" style={{ color: a.color }} strokeWidth={1.8} />
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="flex justify-center lg:hidden pt-4">
              <button
                onClick={() => { if (confirm('ต้องการออกจากระบบ?')) handleLogout(); }}
                className="flex items-center gap-1.5 text-[11px] py-2 px-4 rounded-full"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}
