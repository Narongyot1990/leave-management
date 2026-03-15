'use client';

import { usePathname, useRouter } from 'next/navigation';
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

  let items = driverNav;
  if (role === 'admin') {
    items = adminNav;
  } else if (role === 'leader') {
    items = leaderNav;
  }

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
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
