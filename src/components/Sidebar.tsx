<<<<<<< D:/projects/ITL/drivers/src/components/Sidebar.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, User, FileText, Users, CheckSquare, Settings, PenSquare, LogOut, Car, Rss, Contact2, MapPin, Navigation, History as HistoryIcon, CalendarDays, ClipboardList } from 'lucide-react';
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
  { icon: Contact2, label: 'ผู้ติดต่อ', href: '/contacts' },
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

const adminNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/admin/home' },
  { icon: CalendarDays, label: 'ภาพรวมทุกสาขา', href: '/dashboard' },
  { icon: CheckSquare, label: 'อนุมัติการลา', href: '/leader/approve' },
  { icon: Users, label: 'จัดการพนักงาน', href: '/leader/drivers' },
  { icon: ClipboardList, label: 'ประวัติทั้งหมด', href: '/leader/history' },
  { icon: Rss, label: 'Moments กิจกรรม', href: '/leader/car-wash' },
  { icon: User, label: 'แก้ไขโปรไฟล์', href: '/leader/profile-edit' },
];

export default function Sidebar({ role }: { role: 'driver' | 'leader' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ pendingLeaves: 0, pendingDrivers: 0 });
  
  // Clean up nav items to remove redundancy with BottomNav
  // BottomNav (Mobile) has: Home, Calendar/Dashboard, History, Drivers, Profile
  // Sidebar (Desktop) should focus on: Approval, Subscriptions, Specialized management
  
  const driverNavItems: NavItem[] = [
    { icon: FileText, label: 'ขอลาพักผ่อน', href: '/leave' },
    { icon: Clock, label: 'ประวัติของฉัน', href: '/leave/history' },
    { icon: Navigation, label: 'ลงเวลาทำงาน', href: '/attendance' },
    { icon: Car, label: 'กิจกรรมบริษัท', href: '/car-wash' },
    { icon: Contact2, label: 'ผู้ติดต่อ', href: '/contacts' },
    { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
  ];

  const leaderNavItems: NavItem[] = [
    // Core Ops
    { icon: Clock, label: 'ลงเวลาทำงาน', href: '/leader/attendance' },
    { icon: CheckSquare, label: 'อนุมัติคำขอลา', href: '/leader/approve' },
    { icon: ClipboardList, label: 'มอบหมายงาน (Tasks)', href: '/leader/tasks' },
    
    // Management
    { icon: Users, label: 'จัดการพนักงาน', href: '/leader/drivers' },
    { icon: HistoryIcon, label: 'ตรวจสอบประวัติ', href: '/leader/history' },
    { icon: FileText, label: 'บันทึกการแทน', href: '/leader/substitute' },
    
    // System
    { icon: Rss, label: 'Moments กิจกรรม', href: '/leader/car-wash' },
    { icon: CalendarDays, label: 'ภาพรวมระบบ', href: '/dashboard' },
    { icon: User, label: 'ตั้งค่าส่วนตัว', href: '/leader/profile-edit' },
  ];

  const adminNavItems: NavItem[] = [
    // Core Ops
    { icon: CheckSquare, label: 'อนุมัติทุกสาขา', href: '/leader/approve' },
    { icon: Clock, label: 'เช็กการเข้างาน', href: '/admin/attendance' },
    
    // Config & Mgmt
    { icon: MapPin, label: 'ตั้งค่าจุดพิกัดสาขา', href: '/admin/branches' },
    { icon: Users, label: 'พนักงานทั้งหมด', href: '/leader/drivers' },
    { icon: ClipboardList, label: 'ประวัติภาพรวม', href: '/leader/history' },
    
    // Insights
    { icon: CalendarDays, label: 'Dashboard สรุป', href: '/dashboard' },
    { icon: Rss, label: 'กิจกรรม/Moments', href: '/leader/car-wash' },
    { icon: User, label: 'บัญชีดูแลระบบ', href: '/leader/profile-edit' },
  ];

  useEffect(() => {
    if (role !== 'leader' && role !== 'admin') return;
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/counts');
        const data = await res.json();
        if (data.success) setCounts(data.counts);
      } catch (e) { /* ignore */ }
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'var(--accent)' }}
        >
          {role === 'admin' ? 'ADM' : 'ITL'}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ITL Leave</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{role === 'admin' ? 'ระบบผู้ดูแลสูงสุด' : 'ระบบจัดการลา'}</p>
        </div>
      </div>

      {/* Nav Items */}
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

      {/* Bottom */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <ThemeToggle />
        <div className="flex items-center gap-2">
           {role === 'admin' && (
             <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">Admin</span>
           )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              localStorage.clear();
              router.push(role === 'driver' ? '/login' : '/leader/login');
            }}
            className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-red-500/5 text-red-500/60 hover:text-red-500"
            title="ออกจากระบบ"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
=======
'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, User, FileText, Users, CheckSquare, Settings, PenSquare, LogOut, Car, Rss, Contact2, MapPin, Navigation, History as HistoryIcon, CalendarDays, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import { performLogout } from '@/lib/logout';

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
  { icon: Contact2, label: 'ผู้ติดต่อ', href: '/contacts' },
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

const adminNav: NavItem[] = [
  { icon: Home, label: 'หน้าหลัก', href: '/admin/home' },
  { icon: CalendarDays, label: 'ภาพรวมทุกสาขา', href: '/dashboard' },
  { icon: CheckSquare, label: 'อนุมัติการลา', href: '/leader/approve' },
  { icon: Users, label: 'จัดการพนักงาน', href: '/leader/drivers' },
  { icon: ClipboardList, label: 'ประวัติทั้งหมด', href: '/leader/history' },
  { icon: Rss, label: 'Moments กิจกรรม', href: '/leader/car-wash' },
  { icon: User, label: 'แก้ไขโปรไฟล์', href: '/leader/profile-edit' },
];

export default function Sidebar({ role }: { role: 'driver' | 'leader' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ pendingLeaves: 0, pendingDrivers: 0 });
  
  // Clean up nav items to remove redundancy with BottomNav
  // BottomNav (Mobile) has: Home, Calendar/Dashboard, History, Drivers, Profile
  // Sidebar (Desktop) should focus on: Approval, Subscriptions, Specialized management
  
  const driverNavItems: NavItem[] = [
    { icon: FileText, label: 'ขอลาพักผ่อน', href: '/leave' },
    { icon: Clock, label: 'ประวัติของฉัน', href: '/leave/history' },
    { icon: Navigation, label: 'ลงเวลาทำงาน', href: '/attendance' },
    { icon: Car, label: 'กิจกรรมบริษัท', href: '/car-wash' },
    { icon: Contact2, label: 'ผู้ติดต่อ', href: '/contacts' },
    { icon: Settings, label: 'ตั้งค่าระบบ', href: '/settings' },
  ];

  const leaderNavItems: NavItem[] = [
    // Core Ops
    { icon: Clock, label: 'ลงเวลาทำงาน', href: '/leader/attendance' },
    { icon: CheckSquare, label: 'อนุมัติคำขอลา', href: '/leader/approve' },
    { icon: ClipboardList, label: 'มอบหมายงาน (Tasks)', href: '/leader/tasks' },
    
    // Management
    { icon: Users, label: 'จัดการพนักงาน', href: '/leader/drivers' },
    { icon: HistoryIcon, label: 'ตรวจสอบประวัติ', href: '/leader/history' },
    { icon: FileText, label: 'บันทึกการแทน', href: '/leader/substitute' },
    
    // System
    { icon: Rss, label: 'Moments กิจกรรม', href: '/leader/car-wash' },
    { icon: CalendarDays, label: 'ภาพรวมระบบ', href: '/dashboard' },
    { icon: User, label: 'ตั้งค่าส่วนตัว', href: '/leader/profile-edit' },
  ];

  const adminNavItems: NavItem[] = [
    // Core Ops
    { icon: CheckSquare, label: 'อนุมัติทุกสาขา', href: '/leader/approve' },
    { icon: Clock, label: 'เช็กการเข้างาน', href: '/admin/attendance' },
    
    // Config & Mgmt
    { icon: MapPin, label: 'ตั้งค่าจุดพิกัดสาขา', href: '/admin/branches' },
    { icon: Users, label: 'พนักงานทั้งหมด', href: '/leader/drivers' },
    { icon: ClipboardList, label: 'ประวัติภาพรวม', href: '/leader/history' },
    
    // Insights
    { icon: CalendarDays, label: 'Dashboard สรุป', href: '/dashboard' },
    { icon: Rss, label: 'กิจกรรม/Moments', href: '/leader/car-wash' },
    { icon: User, label: 'บัญชีดูแลระบบ', href: '/leader/profile-edit' },
  ];

  useEffect(() => {
    if (role !== 'leader' && role !== 'admin') return;
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/counts');
        const data = await res.json();
        if (data.success) setCounts(data.counts);
      } catch (e) { /* ignore */ }
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
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-white text-sm"
          style={{ background: 'var(--accent)' }}
        >
          {role === 'admin' ? 'ADM' : 'ITL'}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>ITL Leave</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{role === 'admin' ? 'ระบบผู้ดูแลสูงสุด' : 'ระบบจัดการลา'}</p>
        </div>
      </div>

      {/* Nav Items */}
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

      {/* Bottom */}
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
            title="ออกจากระบบ"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>
    </aside>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/components/Sidebar.tsx
