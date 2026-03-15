'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, Clock, CalendarDays, ClipboardCheck, MapPin, User, Shield, LogOut, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePusherMulti } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';
import { performLogout } from '@/lib/logout';

export default function AdminHomePage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({
    pendingLeaves: 0,
    pendingDrivers: 0,
    totalLeaders: 0,
    activeDrivers: 0
  });

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
        setCounts(data.counts);
      }
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
    if (!confirm('ต้องการออกจากระบบ?')) return;
    const path = await performLogout('admin');
    router.push(path);
  };

  if (!user) return null;

  const stats = [
    { val: branchesLoading ? '-' : branches.length, label: 'สาขา', color: 'var(--info)' },
    { val: counts.totalLeaders, label: 'LEADERS', color: 'var(--success)' },
    { val: counts.activeDrivers, label: 'DRIVERS', color: 'var(--accent)' },
    { val: counts.pendingDrivers, label: 'รออนุมัติ', color: 'var(--warning)' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="admin" />

      <div className="lg:pl-[240px] flex-1 flex flex-col min-h-0 bg-[var(--bg-inset)]/30">
        {/* Very Compact Admin Header */}
        <header className="px-4 pt-3 pb-1 border-b border-[var(--border)] bg-[var(--bg-surface)] mt-1 mx-2 rounded-2xl md:mx-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-md">
                <Shield className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[14px] font-black tracking-tighter leading-none">ADMIN CONSOLE</h1>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30 mt-0.5">Unified System</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <button 
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] bg-[var(--bg-surface)] text-rose-500 hover:bg-rose-500/5 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Stats: 4 items in 1 row - Compact */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-4 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="card p-2 text-center border-b-2 bg-[var(--bg-surface)]" style={{ borderBottomColor: s.color }}>
                  <p className="text-lg font-black leading-none" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[8px] uppercase font-bold mt-1 tracking-tighter opacity-40 leading-none">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Categorized Menu - More Compact */}
            <div className="space-y-4 pb-4">
              {/* Category 1: Attendance */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Monitoring</h3>
                </div>
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => router.push('/admin/attendance')}
                  className="w-full card p-3 flex items-center gap-3 cursor-pointer group hover:border-[var(--accent)]/30 transition-all shadow-sm bg-[var(--bg-surface)]"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-black leading-tight">Timeline Monitor</p>
                    <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest leading-none">Real-time Advanced System</p>
                  </div>
                  <div className="ml-auto w-6 h-6 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  </div>
                </motion.button>
              </div>

              {/* Category 2: Management */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Operations</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MenuCard label="อนุมัติลา" icon={CheckSquare} href="/leader/approve" color="var(--success)" desc="Leaves" />
                  <MenuCard label="ประวัติ" icon={Clock} href="/leader/history" color="var(--text-muted)" desc="History" />
                  <MenuCard label="พนักงาน" icon={Users} href="/leader/drivers" color="var(--accent)" desc="Drivers" />
                  <MenuCard label="มอบหมายงาน" icon={ClipboardCheck} href="/leader/tasks" color="var(--info)" desc="Tasks" />
                </div>
              </div>

              {/* Category 3: System */}
               <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Infrastructure</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MenuCard label="Dashboard" icon={CalendarDays} href="/dashboard" color="var(--warning)" desc="Analytics" />
                  <MenuCard label="สาขา" icon={MapPin} href="/admin/branches" color="var(--info)" desc="Branches" />
                  <div className="col-span-2">
                    <MenuCard label="ตั้งค่าระบบ" icon={User} href="/leader/settings" color="var(--text-muted)" desc="User & System Settings" horizontal />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav role="admin" />
      </div>
    </div>
  );
}

function MenuCard({ label, icon: Icon, href, color, desc, horizontal }: any) {
  const router = useRouter();
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => router.push(href)}
      className={`card p-4 flex ${horizontal ? 'items-center gap-4' : 'flex-col items-center gap-2'} cursor-pointer group transition-all`}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] flex items-center justify-center group-hover:bg-[var(--bg-surface)] transition-colors">
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={2.2} />
      </div>
      <div className={horizontal ? 'text-left' : 'text-center'}>
        <p className="text-[12px] font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">{desc}</p>
      </div>
    </motion.button>
  );
}
