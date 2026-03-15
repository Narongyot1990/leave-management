'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, User, Phone, Calendar, Award, MapPin, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { DriverUser } from '@/lib/types';

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
    // Fetch latest user data from DB
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setName(data.user.name || '');
          setSurname(data.user.surname || '');
          setPhone(data.user.phone || '');
          // Also update localStorage
          localStorage.setItem('driverUser', JSON.stringify(data.user));
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };

    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    // Use stored data first for faster load, then refresh from DB
    const userData = JSON.parse(storedUser);
    setUser(userData);
    setName(userData.name || '');
    setSurname(userData.surname || '');
    setPhone(userData.phone || '');
    
    // Then fetch fresh data from DB
    fetchUserData();
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

    const phoneDigits = phone.trim().replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(phoneDigits)) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: name.trim(),
          surname: surname.trim(),
          phone: phoneDigits,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { 
          ...user, 
          name: name.trim(), 
          surname: surname.trim(),
          phone: phoneDigits,
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

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="แก้ไขข้อมูล" backHref="/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Success Message */}
            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="card p-6 text-center"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--success-light)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>บันทึกสำเร็จ!</p>
                <p className="text-fluid-xs mt-1" style={{ color: 'var(--text-muted)' }}>กำลังกลับไปหน้าหลัก...</p>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="card p-4 flex items-center gap-3"
                style={{ border: '1px solid var(--danger)' }}
              >
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--danger)' }} />
                <span className="text-fluid-sm" style={{ color: 'var(--danger)' }}>{error}</span>
              </motion.div>
            )}

            {/* Profile Card - Bento Style */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Avatar & Info */}
              <div className="card p-6 flex flex-col items-center text-center md:col-span-1">
                <div className="relative mb-4">
                  <UserAvatar 
                    imageUrl={user.lineProfileImage} 
                    displayName={user.lineDisplayName} 
                    tier={user.performanceTier} 
                    size="lg" 
                  />
                  <div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2"
                    style={{ background: 'var(--success)', borderColor: 'var(--bg-base)' }}
                  >
                    <User className="w-3 h-3 text-white" />
                  </div>
                </div>
                <h2 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {user.lineDisplayName}
                </h2>
                <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                  {user.employeeId || 'รอกำหนด'}
                </p>
                <div className="flex gap-2 mt-3">
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                  >
                    {user.branch || 'General'}
                  </span>
                  <span 
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                    style={{ 
                      background: user.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)',
                      color: user.status === 'active' ? 'var(--success)' : 'var(--warning)'
                    }}
                  >
                    {user.status === 'active' ? 'พร้อมใช้งาน' : 'รอยืนยัน'}
                  </span>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="md:col-span-2 grid grid-cols-3 gap-3">
                {/* Performance */}
                <div 
                  className="card p-4 flex flex-col justify-between"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                >
                  <Award className="w-5 h-5 text-white/70" />
                  <div>
                    <p className="text-fluid-lg font-bold text-white">{user.performancePoints || 0}</p>
                    <p className="text-[10px] text-white/70 font-bold uppercase">คะแนน</p>
                  </div>
                </div>

                {/* Vacation Days */}
                <div className="card p-4 flex flex-col justify-between">
                  <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  <div>
                    <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.vacationDays || 0}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>วันลาพักร้อน</p>
                  </div>
                </div>

                {/* Sick Days */}
                <div className="card p-4 flex flex-col justify-between">
                  <Calendar className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                  <div>
                    <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.sickDays || 0}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>วันลาป่วย</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Edit Form */}
            <motion.form 
              onSubmit={handleSubmit} 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.1 }} 
              className="card p-6 space-y-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <h3 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>ข้อมูลส่วนตัว</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-fluid-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    ชื่อ <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="input" 
                    placeholder="กรอกชื่อ" 
                    required 
                  />
                </div>

                {/* Surname */}
                <div>
                  <label className="block text-fluid-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    นามสกุล <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    value={surname} 
                    onChange={(e) => setSurname(e.target.value)} 
                    className="input" 
                    placeholder="กรอกนามสกุล" 
                    required 
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-fluid-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  เบอร์โทรศัพท์ <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="input pl-10" 
                    placeholder="081 234 5678" 
                    required 
                  />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>กรอก 10 หลัก ไม่ต้องมีขีด</p>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-4"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>บันทึกข้อมูล</span>
                  </>
                )}
              </button>
            </motion.form>

            {/* Branch Info */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 0.2 }}
              className="card p-4 flex items-center gap-3"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-light)' }}
              >
                <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>สาขา</p>
                <p className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user.branch || 'ยังไม่กำหนด'}</p>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
}
