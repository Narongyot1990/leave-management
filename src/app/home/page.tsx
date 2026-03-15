<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FilePlus, Clock, CalendarDays, ChevronRight, LogOut, AlertCircle, Umbrella, Thermometer, Briefcase, ClipboardCheck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar';
import { usePusherMulti } from '@/hooks/usePusher';

interface DriverUser {
  id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  branch?: string;
  status?: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
}

const menuItems = [
  { icon: FilePlus, label: 'ขอลา', sub: 'ยื่นคำขอลาใหม่', href: '/leave', color: 'var(--accent)' },
  { icon: Clock, label: 'ประวัติการลา', sub: 'ดูสถานะคำขอทั้งหมด', href: '/leave/history', color: 'var(--success)' },
  { icon: ClipboardCheck, label: 'แบบทดสอบ', sub: 'ทำแบบทดสอบ/งานที่ได้รับ', href: '/tasks', color: 'var(--warning)' },
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
          if (!storedUser) {
            router.push('/login');
            return;
          }
          const userData = JSON.parse(storedUser);
          
          if (!userData.name || !userData.surname) {
            router.push('/profile-setup');
            return;
          }
          setUser(userData);
          setLoading(false);
          return;
        }
        
        const userData = data.user;
        localStorage.setItem('driverUser', JSON.stringify(userData));
        
        if (!userData.name || !userData.surname) {
          router.push('/profile-setup');
          return;
        }
        
        setUser(userData);
      } catch (err) {
        console.error(err);
        const storedUser = localStorage.getItem('driverUser');
        if (!storedUser) {
          router.push('/login');
          return;
        }
        setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Pusher realtime — refresh user data on leave/task changes
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

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'leave-status-changed', callback: handleRefresh },
    ]},
    { channel: 'tasks', bindings: [
      { event: 'new-task', callback: handleRefresh },
    ]},
  ], !!user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('driverUser');
    localStorage.removeItem('pendingStatus');
    router.push('/login');
  };

  const quotaItems = [
    { icon: Umbrella, label: 'พักร้อน', value: user.vacationDays ?? 0, color: 'var(--accent)' },
    { icon: Thermometer, label: 'ลาป่วย', value: user.sickDays ?? 0, color: 'var(--danger)' },
    { icon: Briefcase, label: 'ลากิจ', value: user.personalDays ?? 0, color: 'var(--success)' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-6 pb-2">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="md" />
                {user.status === 'active' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{ background: 'var(--success)', border: '2px solid var(--bg-base)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.name ? `${user.name} ${user.surname || ''}` : user.lineDisplayName}
                </h1>
                <div className="flex items-center gap-1.5">
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>พนักงานขับรถ</p>
                  {user.branch && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {user.branch}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </motion.div>
          </div>
        </header>

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Leave Quota — Hero Section */}
            {user.status === 'active' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="card-neo p-5"
              >
                <p className="text-fluid-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                  วันลาคงเหลือ
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {quotaItems.map((q) => (
                    <div
                      key={q.label}
                      className="text-center p-3 rounded-[var(--radius-md)]"
                      style={{ background: 'var(--bg-inset)' }}
                    >
                      <q.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: q.color }} strokeWidth={1.8} />
                      <p className="stat-number" style={{ color: q.color, fontSize: 'clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)' }}>
                        {q.value}
                      </p>
                      <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>{q.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

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
                  <AlertCircle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                </div>
                <p className="text-fluid-sm font-semibold" style={{ color: 'var(--warning)' }}>บัญชีอยู่ระหว่างตรวจสอบ</p>
                <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>กรุณารอหัวหน้างานเปิดใช้งาน</p>
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-fluid-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
                เมนู
              </p>
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    onClick={() => router.push(item.href)}
                    whileTap={{ scale: 0.98 }}
                    className="card w-full p-4 flex items-center gap-3.5 group cursor-pointer"
                  >
                    <div
                      className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-inset)' }}
                    >
                      <Icon className="w-[18px] h-[18px]" style={{ color: item.color }} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-fluid-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-fluid-xs block" style={{ color: 'var(--text-muted)' }}>{item.sub}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                  </motion.button>
                );
              })}
            </div>

            {/* Logout — small text link at bottom, with confirmation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center lg:hidden mt-6 mb-2"
            >
              <button
                onClick={() => { if (confirm('ต้องการออกจากระบบหรือไม่?')) handleLogout(); }}
                className="flex items-center gap-1.5 text-fluid-xs py-2 px-4 rounded-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}



=======
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FilePlus, Clock, CalendarDays, ChevronRight, LogOut, AlertCircle, Umbrella, Thermometer, Briefcase, ClipboardCheck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar';
import { usePusherMulti } from '@/hooks/usePusher';
import { useForceLogout } from '@/hooks/useForceLogout';
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
=======
>>>>>>> D:/projects/ITL/drivers/src/app/home/page.tsx.undo_before

interface DriverUser {
  id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  branch?: string;
  status?: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
}
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
<<<<<<< D:/projects/ITL/drivers/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
>>>>>>> D:/projects/ITL/drivers/src/app/home/page.tsx.undo_before
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
=======
import { DriverUser } from '@/lib/types';
import LoadingSpinner from '@/components/LoadingSpinner';
import { performLogout } from '@/lib/logout';
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx

const menuItems = [
  { icon: FilePlus, label: 'ขอลา', sub: 'ยื่นคำขอลาใหม่', href: '/leave', color: 'var(--accent)' },
  { icon: Clock, label: 'ประวัติการลา', sub: 'ดูสถานะคำขอทั้งหมด', href: '/leave/history', color: 'var(--success)' },
  { icon: ClipboardCheck, label: 'แบบทดสอบ', sub: 'ทำแบบทดสอบ/งานที่ได้รับ', href: '/tasks', color: 'var(--warning)' },
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
          if (!storedUser) {
            router.push('/login');
            return;
          }
          const userData = JSON.parse(storedUser);
          
          if (!userData.name || !userData.surname) {
            router.push('/profile-setup');
            return;
          }
          setUser(userData);
          setLoading(false);
          return;
        }
        
        const userData = data.user;
        localStorage.setItem('driverUser', JSON.stringify(userData));
        
        if (!userData.name || !userData.surname) {
          router.push('/profile-setup');
          return;
        }
        
        setUser(userData);
      } catch (err) {
        console.error(err);
        const storedUser = localStorage.getItem('driverUser');
        if (!storedUser) {
          router.push('/login');
          return;
        }
        setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Pusher realtime — refresh user data on leave/task changes
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

  // Auto-logout when admin changes role/status
  useForceLogout(user?.id, 'driver');

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'leave-status-changed', callback: handleRefresh },
    ]},
    { channel: 'tasks', bindings: [
      { event: 'new-task', callback: handleRefresh },
    ]},
  ], !!user);

  if (loading) return <LoadingSpinner />;

  if (!user) return null;

  const handleLogout = async () => {
    const loginPath = await performLogout('driver');
    router.push(loginPath);
  };

  const quotaItems = [
    { icon: Umbrella, label: 'พักร้อน', value: user.vacationDays ?? 0, color: 'var(--accent)' },
    { icon: Thermometer, label: 'ลาป่วย', value: user.sickDays ?? 0, color: 'var(--danger)' },
    { icon: Briefcase, label: 'ลากิจ', value: user.personalDays ?? 0, color: 'var(--success)' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

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
                <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="md" />
                {user.status === 'active' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full" style={{ background: 'var(--success)', border: '2px solid var(--bg-base)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.name ? `${user.name} ${user.surname || ''}` : user.lineDisplayName}
                </h1>
                <div className="flex items-center gap-1.5">
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>พนักงานขับรถ</p>
                  {user.branch && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      {user.branch}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </motion.div>
          </div>
        </header>

        <div className="px-4 lg:px-8 py-2">
          <div className="max-w-3xl mx-auto space-y-3">

            {/* Leave Quota — Hero Section */}
            {user.status === 'active' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="card-neo p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  วันลาคงเหลือ
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {quotaItems.map((q) => (
                    <div
                      key={q.label}
                      className="text-center py-2.5 px-2 rounded-[var(--radius-md)]"
                      style={{ background: 'var(--bg-inset)' }}
                    >
                      <q.icon className="w-4 h-4 mx-auto mb-1" style={{ color: q.color }} strokeWidth={1.8} />
                      <p className="font-extrabold leading-none" style={{ color: q.color, fontSize: 'clamp(1.25rem, 1rem + 1vw, 1.75rem)' }}>
                        {q.value}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{q.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pending Status */}
            {user.status === 'pending' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="card p-4 text-center"
                style={{ borderLeftWidth: '4px', borderLeftColor: 'var(--warning)' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--warning-light)' }}>
                  <AlertCircle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                </div>
                <p className="text-fluid-xs font-semibold" style={{ color: 'var(--warning)' }}>บัญชีอยู่ระหว่างตรวจสอบ</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>กรุณารอหัวหน้างานเปิดใช้งาน</p>
              </motion.div>
            )}

            {/* Quick Actions */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
                เมนู
              </p>
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    onClick={() => router.push(item.href)}
                    whileTap={{ scale: 0.98 }}
                    className="card w-full p-3 flex items-center gap-3 group cursor-pointer"
                  >
                    <div
                      className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-inset)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.color }} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-fluid-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>{item.sub}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                  </motion.button>
                );
              })}
            </div>

            {/* Logout — small text link at bottom, with confirmation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center lg:hidden mt-3 mb-1"
            >
              <button
                onClick={() => { if (confirm('ต้องการออกจากระบบหรือไม่?')) handleLogout(); }}
                className="flex items-center gap-1.5 text-fluid-xs py-2 px-4 rounded-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}



>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/home/page.tsx
