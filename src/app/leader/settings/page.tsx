'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle2, MapPin, Lock, Eye, EyeOff } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useBranches } from '@/hooks/useBranches';

export default function LeaderSettingsPage() {
  const router = useRouter();
  const { branches, loading: branchesLoading } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [saved, setSaved] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = async () => {
    setError('');
    
    if (newPassword && newPassword !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/leader-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaderId: user.id,
          name,
          currentPassword: newPassword ? currentPassword : undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSaved(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ตั้งค่า" backHref={role === 'admin' ? '/admin/home' : '/leader/home'} />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--success-light)' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                </div>
                <span className="text-fluid-sm font-medium" style={{ color: 'var(--success)' }}>บันทึกสำเร็จ!</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4"
                style={{ border: '1px solid var(--danger)' }}
              >
                <span className="text-fluid-sm" style={{ color: 'var(--danger)' }}>{error}</span>
              </motion.div>
            )}

            {/* Assigned Branch Section */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-6 border-t-[3px] border-t-[var(--accent)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center border border-[var(--accent)]/10">
                    <MapPin className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-fluid-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>สาขาที่ดูแล</h2>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Assigned Branches</p>
                  </div>
                </div>
                {role === 'admin' ? (
                   <span className="px-2 py-1 rounded-md bg-[var(--accent-light)] text-[var(--accent)] text-[9px] font-black uppercase">All Access</span>
                ) : (
                   <span className="px-2 py-1 rounded-md bg-[var(--bg-inset)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest border border-[var(--border)]">Restricted</span>
                )}
              </div>

              {branchesLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {branches.map((branch) => {
                    const isAssigned = user.branch === branch.code || role === 'admin';
                    return (
                      <div
                        key={branch.code}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl font-black text-sm transition-all border ${
                          isAssigned 
                            ? 'bg-[var(--accent)] text-white border-transparent shadow-lg shadow-accent/20 scale-105' 
                            : 'bg-[var(--bg-inset)] text-[var(--text-muted)] border-[var(--border)] opacity-40'
                        }`}
                      >
                        {branch.code}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-[10px] font-medium mt-6 text-center italic" style={{ color: 'var(--text-muted)' }}>
                {role === 'admin' ? '• คุณมีสิทธิ์เข้าถึงทุกสาขาในฐานะผู้ดูแลระบบ •' : '• ติดต่อ Admin หากต้องการสลับสาขาที่รับผิดชอบ •'}
              </p>
            </motion.div>

            {/* Profile Edit */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>ข้อมูลส่วนตัว</h2>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>อีเมล: {user.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-fluid-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                    ชื่อ
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input w-full"
                    placeholder="ชื่อ"
                  />
                </div>
              </div>
            </motion.div>

            {/* Password Change */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>เปลี่ยนรหัสผ่าน</h2>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>ไม่จำเป็นต้องกรอกหากไม่ต้องการเปลี่ยน</p>
                </div>
              </div>

              <div className="space-y-3">
                {newPassword && (
                  <div>
                    <label className="text-fluid-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                      รหัสผ่านปัจจุบัน
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input w-full pr-10"
                        placeholder="รหัสผ่านปัจจุบัน"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <Eye className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-fluid-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full"
                    placeholder="รหัสผ่านใหม่ (6+ ตัว)"
                  />
                </div>

                <div>
                  <label className="text-fluid-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input w-full"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                  />
                </div>
              </div>
            </motion.div>

            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn btn-primary w-full"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
