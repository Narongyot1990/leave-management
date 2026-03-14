'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, CalendarDays, Users, Rss, User, CheckSquare, ClipboardList, Contact2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const driverNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/home' },
  { icon: CalendarDays, label: 'ปฏิทิน', href: '/dashboard' },
  { icon: Rss, label: 'Moments', href: '/car-wash/feed' },
  { icon: Contact2, label: 'ผู้ติดต่อ', href: '/contacts' },
  { icon: User, label: 'โปรไฟล์', href: '/profile' },
];

const leaderNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/leader/home' },
  { icon: CalendarDays, label: 'ปฏิทิน', href: '/dashboard' },
  { icon: Rss, label: 'Moments', href: '/leader/car-wash' },
  { icon: ClipboardList, label: 'ประวัติ', href: '/leader/history' },
  { icon: Users, label: 'พนักงาน', href: '/leader/drivers' },
];

const adminNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/admin/home' },
  { icon: CalendarDays, label: 'ปฏิทิน', href: '/dashboard' },
  { icon: CheckSquare, label: 'อนุมัติ', href: '/leader/approve' },
  { icon: Users, label: 'พนักงาน', href: '/leader/drivers' },
  { icon: User, label: 'โปรไฟล์', href: '/leader/profile-edit' },
];

export default function BottomNav({ role }: { role: 'driver' | 'leader' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDrivers, setPendingDrivers] = useState(0);

  let items = driverNav;
  if (role === 'admin') {
    items = adminNav;
  } else if (role === 'leader') {
    items = leaderNav;
  }

  // Fetch pending counts for leader/admin
  useEffect(() => {
    if (role !== 'leader' && role !== 'admin') return;

    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/counts');
        const data = await res.json();
        if (data.success) {
          setPendingCount(data.counts.pendingLeaves || 0);
          setPendingDrivers(data.counts.pendingDrivers || 0);
        }
      } catch (e) {
        console.error('Failed to fetch counts', e);
      }
    };

    fetchCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [role]);

  // Calculate badge for approve (pending leaves) or drivers (pending drivers)
  const getBadge = (itemHref: string) => {
    if (itemHref.includes('approve') || itemHref.includes('dashboard')) {
      return pendingCount > 0 ? pendingCount : 0;
    }
    if (itemHref.includes('drivers')) {
      return pendingDrivers > 0 ? pendingDrivers : 0;
    }
    return 0;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/home' && item.href !== '/leader/home' && item.href !== '/admin/home' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const badge = getBadge(item.href);

          return (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(item.href)}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] rounded-[var(--radius-md)] px-2 py-1 transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              
              {/* Badge */}
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'var(--danger)' }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
