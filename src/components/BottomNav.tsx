'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, Clock, User, FileText, Users, CheckSquare, ClipboardList, Car } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const driverNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/home' },
  { icon: FileText, label: 'ขอลา', href: '/leave' },
  { icon: Car, label: 'กิจกรรม', href: '/car-wash' },
  { icon: Clock, label: 'ประวัติ', href: '/leave/history' },
  { icon: User, label: 'โปรไฟล์', href: '/profile' },
];

const leaderNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/leader/home' },
  { icon: CheckSquare, label: 'อนุมัติ', href: '/leader/approve' },
  { icon: Car, label: 'กิจกรรม', href: '/leader/car-wash' },
  { icon: ClipboardList, label: 'ประวัติ', href: '/leader/history' },
  { icon: Users, label: 'พนักงาน', href: '/leader/drivers' },
];

export default function BottomNav({ role }: { role: 'driver' | 'leader' }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = role === 'leader' ? leaderNav : driverNav;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
          {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(item.href)}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] rounded-[var(--radius-md)] px-2 py-1 transition-colors"
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
