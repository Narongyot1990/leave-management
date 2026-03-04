'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, CalendarDays, Clock, User, FileText, Users, CheckSquare, ClipboardList, Settings, PenSquare, LogOut, Car, Rss } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const driverNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/home' },
  { icon: FileText, label: 'ขอลา', href: '/leave' },
  { icon: Clock, label: 'ประวัติการลา', href: '/leave/history' },
  { icon: Rss, label: 'Moments', href: '/car-wash/feed' },
  { icon: Car, label: 'โพสต์กิจกรรม', href: '/car-wash' },
  { icon: CalendarDays, label: 'Dashboard', href: '/dashboard' },
  { icon: PenSquare, label: 'แก้ไขข้อมูล', href: '/profile-edit' },
  { icon: Settings, label: 'ตั้งค่า', href: '/settings' },
];

const leaderNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/leader/home' },
  { icon: CheckSquare, label: 'อนุมัติการลา', href: '/leader/approve' },
  { icon: ClipboardList, label: 'ประวัติทั้งหมด', href: '/leader/history' },
  { icon: Users, label: 'จัดการพนักงาน', href: '/leader/drivers' },
  { icon: FileText, label: 'บันทึกการแทน', href: '/leader/substitute' },
  { icon: Rss, label: 'Moments กิจกรรม', href: '/leader/car-wash' },
  { icon: CalendarDays, label: 'Dashboard', href: '/dashboard' },
  { icon: User, label: 'แก้ไขโปรไฟล์', href: '/leader/profile-edit' },
];

export default function Sidebar({ role }: { role: 'driver' | 'leader' }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = role === 'leader' ? leaderNav : driverNav;

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col z-40"
      style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'var(--accent)' }}
        >
          ITL
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ITL Leave</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>ระบบจัดการลา</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 px-3 min-h-[40px] rounded-[var(--radius-md)] text-left transition-colors text-sm"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-light)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <ThemeToggle />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            localStorage.clear();
            router.push(role === 'leader' ? '/leader/login' : '/login');
          }}
          className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] transition-colors"
          style={{ color: 'var(--danger)' }}
          title="ออกจากระบบ"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </motion.button>
      </div>
    </aside>
  );
}
