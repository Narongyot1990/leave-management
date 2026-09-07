'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, Clock, CalendarDays, Settings, LogOut, LayoutGrid, ClipboardList, Info, ClipboardCheck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useForceLogout } from '@/hooks/useForceLogout';
import { performLogout } from '@/lib/logout';

export default function LeaderHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingOt, setPendingOt] = useState(0);
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
        setPendingOt(data.counts.pendingOt);
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
    { channel: 'ot-requests', bindings: [
      { event: 'new-ot-request', callback: fetchCounts },
      { event: 'ot-status-changed', callback: fetchCounts },
      { event: 'ot-cancelled', callback: fetchCounts },
    ]},
    { channel: 'users', bindings: [
      { event: 'new-driver', callback: fetchCounts },
      { event: 'driver-activated', callback: fetchCounts },
      { event: 'driver-deleted', callback: fetchCounts },
    ]},
  ], !!user);

  const handleLogout = async () => {
    if (!confirm('ต้องการออกจากระบบ?')) return;
    const path = await performLogout(role);
    router.push(path);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-5 pb-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="relative shrink-0">
               <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-inset)]">
                  {user.lineProfileImage ? (
                    <img src={user.lineProfileImage} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--accent)' }}>
                       {user.name?.charAt(0) || 'L'}
                    </div>
                  )}
               </div>
               <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--bg-base)] bg-emerald-500 shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black tracking-tight truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{user.name}</h1>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {role === 'admin' ? 'SYSTEM ADMINISTRATOR' : `Site Leader • ${user.branch || 'PENDING'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)] text-rose-500 hover:bg-rose-500/5 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-8 pt-4">

            {/* Section 1: Attendance */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1">Presence</h3>
               <motion.button
                 onClick={() => router.push('/leader/attendance')}
                 whileTap={{ scale: 0.98 }}
                 className="w-full card p-5 flex items-center gap-4 cursor-pointer group hover:border-[var(--accent)]/30 transition-all shadow-sm"
               >
                 <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                   <Clock className="w-6 h-6" />
                 </div>
                 <div className="text-left">
                   <p className="text-lg font-black leading-tight">ลงเวลา</p>
                   <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Attendance Clocking</p>
                 </div>
               </motion.button>
            </div>

            {/* Section 2: Management */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1">Management</h3>
               <div className="grid grid-cols-2 gap-3">
                  <MenuButton
                    label="อนุมัติลา"
                    icon={CheckSquare}
                    href="/leader/approve"
                    color="var(--success)"
                    badge={pendingLeave}
                  />
                  <MenuButton
                    label="อนุมัติ OT"
                    icon={Clock}
                    href="/leader/approve-ot"
                    color="var(--success)"
                    badge={pendingOt}
                  />
                  <MenuButton
                    label="ประวัติ"
                    icon={ClipboardList}
                    href="/leader/history"
                    color="var(--info)"
                  />
                  <MenuButton 
                    label="พนักงาน" 
                    icon={Users} 
                    href="/leader/drivers" 
                    color="var(--accent)" 
                    badge={pendingDriver}
                  />
                  <MenuButton 
                    label="มอบหมายงาน" 
                    icon={ClipboardCheck} 
                    href="/leader/tasks" 
                    color="var(--info)" 
                  />
               </div>
            </div>

            {/* Section 3: Configuration */}
            <div className="space-y-3">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-1">System</h3>
               <motion.button
                 onClick={() => router.push('/leader/settings')}
                 whileTap={{ scale: 0.98 }}
                 className="w-full card p-4 flex items-center gap-4 cursor-pointer group hover:border-[var(--text-muted)]/30 transition-all border-dashed"
               >
                 <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center text-[var(--text-muted)]">
                   <Settings className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                   <p className="text-sm font-black">ตั้งค่า</p>
                   <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Profile & System Settings</p>
                 </div>
               </motion.button>
            </div>

          </div>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}

function MenuButton({ label, icon: Icon, href, color, badge }: any) {
  const router = useRouter();
  return (
    <motion.button
      onClick={() => router.push(href)}
      whileTap={{ scale: 0.95 }}
      className="card p-4 flex flex-col items-center gap-2 cursor-pointer relative group transition-all"
    >
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg ring-2 ring-[var(--bg-base)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center group-hover:bg-[var(--bg-surface)] transition-colors shadow-inner">
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={2.5} />
      </div>
      <span className="text-[11px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </motion.button>
  );
}
