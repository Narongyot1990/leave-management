'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, Rss, UserCircle, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const driverNav: NavItem[] = [
  { icon: Home, label: 'Home', href: '/home' },
  { icon: CalendarDays, label: 'Calendar', href: '/dashboard' },
  { icon: Users, label: 'Contacts', href: '/contacts' },
  { icon: Rss, label: 'Activity', href: '/car-wash/feed' },
  { icon: UserCircle, label: 'Profile', href: '/profile' },
];

const leaderNav: NavItem[] = [
  { icon: Home, label: 'Home', href: '/leader/home' },
  { icon: CalendarDays, label: 'Calendar', href: '/dashboard' },
  { icon: Rss, label: 'Activity', href: '/leader/car-wash' },
  { icon: UserCircle, label: 'Profile', href: '/leader/settings?view=profile' },
];

const adminNav: NavItem[] = [
  { icon: Home, label: 'Home', href: '/admin/home' },
  { icon: CalendarDays, label: 'Calendar', href: '/dashboard' },
  { icon: Rss, label: 'Activity', href: '/admin/car-wash' },
  { icon: UserCircle, label: 'Profile', href: '/admin/settings?view=profile' },
];

export default function BottomNav({ role }: { role: 'driver' | 'leader' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();

  let items = driverNav;
  if (role === 'admin') items = adminNav;
  else if (role === 'leader') items = leaderNav;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/home' &&
              item.href !== '/leader/home' &&
              item.href !== '/admin/home' &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(item.href)}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-[60px] min-h-[44px] rounded-[var(--radius-md)] px-2 py-1 transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-[var(--accent-light)] rounded-2xl -z-10"
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-black uppercase tracking-tight leading-none">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
