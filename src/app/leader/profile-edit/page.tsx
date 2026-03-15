'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

interface LeaderUser {
  id: string;
  name: string;
  email: string;
}

export default function LeaderProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          setName(data.user.name || '');
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('กรุณากรอกชื่อ');
      return;
    }

    if (newPassword && !currentPassword) {
      setError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/leader-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaderId: user?.id,
          name: name.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...user, name: name.trim() };
        localStorage.setItem('leaderUser', JSON.stringify(updatedUser));
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccess(false);
        }, 2000);
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
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="แก้ไขโปรไฟล์" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto space-y-4">
            {success && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-3.5 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--success-light)' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>บันทึกสำเร็จ!</p>
              </motion.div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-3.5 space-y-4">
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ชื่อ-นามสกุล</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="กรอกชื่อ-นามสกุล" required />
              </div>

              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>อีเมล</label>
                <input type="email" value={user.email} disabled className="input opacity-50 cursor-not-allowed" />
                <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>อีเมลไม่สามารถเปลี่ยนได้</p>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <h3 className="text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>เปลี่ยนรหัสผ่าน</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>รหัสผ่านปัจจุบัน</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="กรอกรหัสผ่านปัจจุบัน" />
                  </div>
                  <div>
                    <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>รหัสผ่านใหม่</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="กรอกรหัสผ่านใหม่" />
                  </div>
                  <div>
                    <label className="block text-fluid-xs mb-1" style={{ color: 'var(--text-muted)' }}>ยืนยันรหัสผ่านใหม่</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}



