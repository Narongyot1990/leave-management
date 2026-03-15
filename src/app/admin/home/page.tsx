'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, Clock, CalendarDays, ClipboardCheck, MapPin, User, Shield, LogOut } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { performLogout } from '@/lib/logout';

const menu = [
  { icon: Clock, label: 'ติดตามเวลา', href: '/admin/attendance', color: 'var(--accent)' },
  { icon: CheckSquare, label: 'อนุมัติลา', href: '/leader/approve', color: 'var(--success)' },
  { icon: Users, label: 'พนักงาน', href: '/leader/drivers', color: 'var(--accent)' },
  { icon: MapPin, label: 'สาขา', href: '/admin/branches', color: 'var(--info)' },
  { icon: CalendarDays, label: 'Dashboard', href: '/dashboard', color: 'var(--warning)' },
  { icon: ClipboardCheck, label: 'มอบหมายงาน', href: '/leader/tasks', color: 'var(--info)' },
  { icon: Clock, label: 'ประวัติ', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: User, label: 'ตั้งค่า', href: '/leader/settings', color: 'var(--text-muted)' },
];

function MonitorWidget() {
  const [activeLeaders, setActiveLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActive = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance?date=${today}`);
      const data = await res.json();
      if (data.success) {
        // Group by user and find those whose last status is 'in'
        const userStatus = new Map();
        [...data.records].reverse().forEach(r => {
          if (!userStatus.has(r.userId)) userStatus.set(r.userId, r);
        });
        const active = Array.from(userStatus.values()).filter(r => r.type === 'in');
        setActiveLeaders(active);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);
  usePusherMulti([{ channel: 'users', bindings: [{ event: 'leader-attendance', callback: fetchActive }] }], true);

  if (loading && activeLeaders.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_var(--emerald)]" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Real-time Leaders Status</h3>
         </div>
         <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{activeLeaders.length} ACTIVE</span>
      </div>

      {activeLeaders.length === 0 ? (
        <div className="py-6 text-center bg-inset rounded-2xl border border-dashed border-border">
           <p className="text-[10px] font-bold text-muted uppercase tracking-tighter italic">ยังไม่มีใคร Clock In ในขณะนี้</p>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
          {activeLeaders.map(leader => (
            <div key={leader._id} className="flex-shrink-0 flex items-center gap-3 bg-inset p-2.5 rounded-2xl border border-border/40 min-w-[160px] max-w-[180px]">
               <div className="w-10 h-10 rounded-xl relative shrink-0 overflow-hidden border border-border/50">
                  <img src={leader.userImage || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-surface)] rounded-full" />
               </div>
               <div className="min-w-0">
                  <p className="text-[11px] font-black truncate" style={{ color: 'var(--text-primary)' }}>{leader.userName}</p>
                  <p className="text-[9px] font-black text-accent uppercase tracking-tighter truncate">{leader.branch}</p>
                  <p className="text-[8px] font-bold text-muted mt-0.5">{new Date(leader.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function AdminHomePage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [pendingDriver, setPendingDriver] = useState(0);
  const [leaderCount, setLeaderCount] = useState(0);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user.role === 'admin') {
          setUser(data.user);
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
      const res = await fetch('/api/counts?type=all');
      const data = await res.json();
      if (data.success) {
        setPendingLeave(data.counts.pendingLeaves);
        setPendingDriver(data.counts.pendingDrivers);
      }
      const lr = await fetch('/api/leaders');
      const ld = await lr.json();
      if (ld.success) setLeaderCount(ld.leaders?.length || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (user) fetchCounts(); }, [user, fetchCounts]);

  usePusherMulti([
    { channel: 'leave-requests', bindings: [
      { event: 'new-leave-request', callback: fetchCounts },
      { event: 'leave-status-changed', callback: fetchCounts },
    ]},
    { channel: 'users', bindings: [
      { event: 'new-driver', callback: fetchCounts },
      { event: 'driver-activated', callback: fetchCounts },
    ]},
  ], !!user);

  const handleLogout = async () => {
    const path = await performLogout('admin');
    router.push(path);
  };

  if (!user) return null;

  const stats = [
    { val: pendingDriver, label: 'พนักงานใหม่', color: 'var(--accent)' },
    { val: leaderCount, label: 'Leaders', color: 'var(--success)' },
    { val: branchesLoading ? '-' : branches.length, label: 'สาขา', color: 'var(--info)' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      {/* Admin banner */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-1.5" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'white' }}>
        <Shield className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold tracking-wide">ADMIN</span>
      </div>

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6 pt-9 lg:pt-0">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-4 pb-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>สวัสดี, {user.name || 'Admin'}</h1>
              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>ITL Fleet Management</p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="px-4 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="card p-3 text-center border-b-2" style={{ borderBottomColor: s.color }}>
                  <p className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] uppercase font-bold mt-1.5 tracking-tighter" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Monitor Widget */}
            <MonitorWidget />

            {/* Menu grid */}
            <div className="grid grid-cols-4 gap-3">
              {menu.map((m, i) => {
                const Icon = m.icon;
                return (
                  <motion.button
                    key={m.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.03 }}
                    onClick={() => router.push(m.href)}
                    whileTap={{ scale: 0.95 }}
                    className="card p-3 flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                      <Icon className="w-[18px] h-[18px]" style={{ color: m.color }} strokeWidth={1.8} />
                    </div>
                    <span className="text-[10px] font-semibold leading-tight text-center" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="flex justify-center lg:hidden pt-2">
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-[11px] py-2 px-4 rounded-full" style={{ color: 'var(--danger)' }}>
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>

          </div>
        </div>
      </div>

      <BottomNav role="admin" />
    </div>
  );
}
