'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';

interface DriverUser {
  id: string;
  lineUserId: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  status: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    setName(userData.name || '');
    setSurname(userData.surname || '');
    setPhone(userData.phone || '');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !surname.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    if (!phone.trim()) {
      setError('กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    if (!/^\d{10}$/.test(phone.trim().replace(/[-\s]/g, ''))) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          name: name.trim(),
          surname: surname.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { 
          ...user, 
          name: name.trim(), 
          surname: surname.trim(),
          phone: phone.trim(),
        };
        localStorage.setItem('driverUser', JSON.stringify(updatedUser));
        setSuccess(true);
        setTimeout(() => {
          router.push('/home');
        }, 1500);
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

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="แก้ไขข้อมูล" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Profile Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-6 text-center">
              <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="lg" className="mx-auto mb-3" />
              <h2 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.lineDisplayName}</h2>
              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>{user.status === 'active' ? 'พร้อมใช้งาน' : 'รอยืนยัน'}</p>
            </motion.div>

            {success && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-5 text-center">
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

            <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ชื่อ</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="กรอกชื่อ" required />
                </div>
                <div>
                  <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>นามสกุล</label>
                  <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} className="input" placeholder="กรอกนามสกุล" required />
                </div>
              </div>
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>เบอร์โทรศัพท์</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก" required />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}



