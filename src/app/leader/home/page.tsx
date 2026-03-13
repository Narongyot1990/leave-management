'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckSquare, Users, PenSquare, CalendarDays, Clock, User, ChevronRight, LogOut, ClipboardCheck, Settings } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import Pusher from 'pusher-js';

interface LeaderUser {
  id: string;
  name: string;
  email: string;
}

const menuItems = [
  { icon: CheckSquare, label: 'อนุมัติลา', sub: 'ตรวจสอบคำขอลาใหม่', href: '/leader/approve', color: 'var(--success)' },
  { icon: Users, label: 'จัดการพนักงาน', sub: 'เพิ่ม/แก้ไข/เปิดใช้งาน', href: '/leader/drivers', color: 'var(--accent)' },
  { icon: PenSquare, label: 'บันทึกแทน', sub: 'บันทึกข้อมูลการแทน', href: '/leader/substitute', color: 'var(--info)' },
  { icon: CalendarDays, label: 'Dashboard', sub: 'ภาพรวมตารางวันลา', href: '/dashboard', color: 'var(--warning)' },
  { icon: Clock, label: 'ประวัติทั้งหมด', sub: 'ดูประวัติการลาและบันทึก', href: '/leader/history', color: 'var(--text-muted)' },
  { icon: ClipboardCheck, label: 'จัดการ Tasks', sub: 'สร้างแบบทดสอบ/งานให้พนักงาน', href: '/leader/tasks', color: 'var(--info)' },
  { icon: User, label: 'แก้ไขโปรไฟล์', sub: 'แก้ไขข้อมูลส่วนตัว', href: '/leader/profile-edit', color: 'var(--danger)' },
  { icon: Settings, label: 'ตั้งค่า', sub: 'ตั้งค่าสาขาที่ดูแล', href: '/leader/settings', color: 'var(--text-muted)' },
];

export default function LeaderHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<LeaderUser | null>(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingDriverCount, setPendingDriverCount] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) {
      router.push('/leader/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/counts?type=all');
        const data = await res.json();
        if (data.success) {
          setPendingLeaveCount(data.counts.pendingLeaves);
          setPendingDriverCount(data.counts.pendingDrivers);
        }
      } catch (err) {
        console.error('Failed to fetch counts:', err);
      }
    };

    fetchCounts();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
    });

    const channel = pusher.subscribe('leave-requests');
    channel.bind('new-leave-request', () => {
      setPendingLeaveCount(prev => prev + 1);
    });

    return () => {
      pusher.unsubscribe('leave-requests');
    };
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('leaderUser');
    router.push('/leader/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        {/* Header */}
        <header className="px-4 lg:px-8 pt-6 pb-2">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-white font-bold"
                style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-fluid-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</h1>
                <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>หัวหน้างาน</p>
              </div>
              <ThemeToggle />
            </motion.div>
          </div>
        </header>

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-3xl mx-auto space-y-2">
            <p className="text-fluid-xs font-semibold uppercase tracking-wider px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
              เมนู
            </p>

            {/* Desktop: 2-col grid, Mobile: stacked cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {menuItems.map((item, i) => {
                const Icon = item.icon;
                const isApprove = item.href === '/leader/approve';
                const isDrivers = item.href === '/leader/drivers';
                const badgeCount = isApprove ? pendingLeaveCount : isDrivers ? pendingDriverCount : 0;
                
                return (
                  <motion.button
                    key={i}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => router.push(item.href)}
                    whileTap={{ scale: 0.98 }}
                    className="card w-full p-4 flex items-center gap-3.5 group cursor-pointer relative"
                  >
                    {(isApprove || isDrivers) && badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--danger)] text-white text-xs font-bold flex items-center justify-center">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                    <div
                      className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-inset)' }}
                    >
                      <Icon className="w-[18px] h-[18px]" style={{ color: item.color }} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="text-fluid-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                      <span className="text-fluid-xs block" style={{ color: 'var(--text-muted)' }}>{item.sub}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="btn btn-ghost w-full lg:hidden mt-4"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </motion.button>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
