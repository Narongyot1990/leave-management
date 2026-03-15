'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { DriverUser } from '@/lib/types';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    setName(userData.name || '');
    setPhone(userData.phone || '');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          name,
          phone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...user, name, phone };
        localStorage.setItem('driverUser', JSON.stringify(updatedUser));
        setSuccess(true);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ตั้งค่าข้อมูลส่วนตัว" backHref="/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto space-y-3">
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card p-4 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <span className="text-fluid-sm font-medium" style={{ color: 'var(--success)' }}>บันทึกข้อมูลสำเร็จ!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Profile Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4">
              <div className="flex items-center gap-3">
                <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="md" />
                <div>
                  <h2 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.lineDisplayName}</h2>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>พนักงานขับรถ</p>
                </div>
              </div>
            </motion.div>

            <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-4 space-y-3">
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ชื่อ-นามสกุล</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} className="input" placeholder="กรอกชื่อ-นามสกุล" />
              </div>
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>เบอร์โทรศัพท์</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} className="input" placeholder="กรอกเบอร์โทรศัพท์" />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : 'บันทึกข้อมูล'}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}



