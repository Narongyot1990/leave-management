'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  User,
  FileText,
  Users,
  CheckSquare,
  LogOut,
  Car,
  Rss,
  Contact2,
  MapPin,
  Navigation,
  History as HistoryIcon,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { performLogout } from '@/lib/logout';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

export default function Sidebar({ role }: { role: 'driver' | 'leader' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ pendingLeaves: 0, pendingDrivers: 0 });

  const driverNavItems: NavItem[] = [
    { icon: FileText, label: 'Leave Request', href: '/leave' },
    { icon: Clock, label: 'Leave History', href: '/leave/history' },
    { icon: Navigation, label: 'Attendance', href: '/attendance' },
    { icon: Car, label: 'Company Activity', href: '/car-wash' },
    { icon: Users, label: 'Contacts', href: '/contacts' },
    { icon: CalendarDays, label: 'Dashboard', href: '/dashboard' },
  ];

  const leaderNavItems: NavItem[] = [
    { icon: Clock, label: 'Attendance', href: '/leader/attendance' },
    { icon: CheckSquare, label: 'Leave Approval', href: '/leader/approve' },
    { icon: Users, label: 'Manage Staff', href: '/leader/drivers' },
    { icon: HistoryIcon, label: 'History', href: '/leader/history' },
    { icon: FileText, label: 'Substitute Log', href: '/leader/substitute' },
    { icon: Rss, label: 'Moments', href: '/leader/car-wash' },
    { icon: CalendarDays, label: 'Dashboard', href: '/dashboard' },
    { icon: User, label: 'Settings', href: '/leader/settings' },
  ];

  const adminNavItems: NavItem[] = [
    { icon: CheckSquare, label: 'Approve Requests', href: '/admin/approve' },
    { icon: Clock, label: 'Attendance Audit', href: '/admin/attendance' },
    { icon: MapPin, label: 'Branch Management', href: '/admin/branches' },
    { icon: Users, label: 'All Staff', href: '/admin/drivers' },
    { icon: ClipboardList, label: 'Global History', href: '/admin/history' },
    { icon: FileText, label: 'Task Assignment', href: '/admin/tasks' },
    { icon: Rss, label: 'Moments', href: '/admin/car-wash' },
    { icon: CalendarDays, label: 'Dashboard', href: '/dashboard' },
    { icon: User, label: 'System Settings', href: '/admin/settings' },
  ];

  useEffect(() => {
    if (role !== 'leader' && role !== 'admin') return;
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/counts');
        const data = await res.json();
        if (data.success) setCounts(data.counts);
      } catch {
        // ignore
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [role]);

  let items = driverNavItems;
  if (role === 'admin') items = adminNavItems;
  else if (role === 'leader') items = leaderNavItems;

  const getBadge = (href: string) => {
    if (href.includes('approve')) return counts.pendingLeaves;
    if (href.includes('drivers')) return counts.pendingDrivers;
    return 0;
  };

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col z-40"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'var(--accent)' }}
        >
          {role === 'admin' ? 'ADM' : 'ITL'}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ITL Leave</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {role === 'admin' ? 'Admin Console' : 'Leave Management'}
          </p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const badge = getBadge(item.href);

          return (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center justify-between px-3 min-h-[44px] rounded-[var(--radius-md)] text-left transition-all text-sm group"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="truncate">{item.label}</span>
              </div>

              {badge > 0 && !isActive && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-500">{badge}</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <ThemeToggle />
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">Admin</span>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              const loginPath = await performLogout(role);
              router.push(loginPath);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-red-500/5 text-red-500/60 hover:text-red-500"
            title="Logout"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
