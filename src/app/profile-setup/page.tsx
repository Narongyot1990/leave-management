'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, Clock } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { DriverUser } from '@/lib/types';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<DriverUser | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          status: 'pending'
        };
        localStorage.setItem('driverUser', JSON.stringify(updatedUser));
        localStorage.setItem('pendingStatus', 'true');
        router.push('/home');
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

  if (user.name && user.surname && user.phone && user.status === 'active') {
    router.push('/home');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px] space-y-4">
        <div className="text-center mb-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <UserAvatar imageUrl={user.lineProfileImage} displayName={user.lineDisplayName} tier={user.performanceTier} size="lg" className="mx-auto mb-3" />
          </motion.div>
          <h1 className="text-fluid-xl font-bold" style={{ color: 'var(--text-primary)' }}>ยินดีต้อนรับ!</h1>
          <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>กรุณากรอกข้อมูลเพื่อใช้งานระบบ</p>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--warning-light)' }}>
          <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-fluid-sm font-medium" style={{ color: 'var(--warning)' }}>สถานะ: รอยืนยัน</p>
            <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>กรุณารอหัวหน้างานยืนยัน</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card-neo p-5 space-y-4">
          <div>
            <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ชื่อ</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="กรอกชื่อ" required />
          </div>
          <div>
            <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>นามสกุล</label>
            <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} className="input" placeholder="กรอกนามสกุล" required />
          </div>
          <div>
            <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>เบอร์โทรศัพท์</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
            {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}



