'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle2, MapPin, Lock, Eye, EyeOff, Shield, Users } from 'lucide-react';
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

  const isRootAdmin = user?.id === 'admin_root';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ตั้งค่าระบบ" subtitle="จัดการข้อมูลส่วนตัวและความปลอดภัย" backHref={role === 'admin' ? '/admin/home' : '/leader/home'} />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-xl mx-auto space-y-4">

            {saved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-4 flex items-center gap-4 border-emerald-500/20 bg-emerald-500/5 shadow-xl shadow-emerald-500/10"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                   <span className="text-sm font-black uppercase tracking-tight block" style={{ color: 'var(--emerald)' }}>บันทึกสำเร็จ</span>
                   <p className="text-[10px] font-bold text-muted uppercase tracking-widest">ข้อมูลของคุณได้รับการอัปเดตแล้ว</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="card p-4 border-red-500/20 bg-red-500/5"
              >
                <p className="text-xs font-bold text-red-500">{error}</p>
              </motion.div>
            )}

            {/* Profile Info Bento Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5 overflow-hidden group">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center transition-transform group-hover:rotate-12">
                        <Settings className="w-6 h-6 text-accent" />
                     </div>
                     <div>
                        <h2 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>ข้อมูลส่วนตัว</h2>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">{user?.email || 'Loading...'}</p>
                     </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] ${role === 'admin' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                     {role === 'admin' ? 'Administrator' : 'Leader'}
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="relative group/field">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 block px-1 transition-colors group-focus-within/field:text-accent" style={{ color: 'var(--text-muted)' }}>
                       ชื่อ-นามสกุล (Name)
                    </label>
                    <input
                      type="text"
                      disabled={isRootAdmin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full h-12 bg-inset rounded-xl px-4 text-sm font-bold border-none ring-1 ring-border focus:ring-2 focus:ring-accent outline-none transition-all ${isRootAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="กรอกชื่อของคุณ"
                    />
                    {isRootAdmin && (
                       <p className="text-[9px] font-bold text-amber-500 mt-1.5 px-1 uppercase tracking-tighter">
                          * ชื่อผู้ดูแลระบบหลักถูกกำหนดโดยระบบ
                       </p>
                    )}
                  </div>
               </div>
            </motion.div>

            {/* Assigned Branch Bento Card */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5 overflow-hidden">
               <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-amber-500" />
                     </div>
                     <h2 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>สาขาที่รับผิดชอบ</h2>
                  </div>
                  {role === 'admin' && (
                     <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">All Access</span>
                     </div>
                  )}
               </div>

               <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {branches.map((branch) => {
                    const isAssigned = user?.branch === branch.code || role === 'admin';
                    return (
                      <div
                        key={branch.code}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl font-black text-xs transition-all border ${
                          isAssigned 
                            ? 'bg-accent text-white border-transparent shadow-lg shadow-accent/20 scale-105 z-10' 
                            : 'bg-inset text-muted border-border opacity-30 grayscale'
                        }`}
                      >
                        {branch.code}
                      </div>
                    );
                  })}
               </div>

               <p className="text-[10px] font-bold mt-5 text-center text-muted uppercase tracking-tighter italic px-4">
                 {role === 'admin' ? '• คุณมีสิทธิ์เข้าถึงทุกสาขาในฐานะผู้ดูแลระบบสูงสุด •' : '• ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยนแปลงสาขา •'}
               </p>
            </motion.div>

            {/* Admin Control Center */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="card p-5 relative overflow-hidden group border-b-2 border-b-indigo-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>Admin Control Center</h2>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">การจัดการระดับผู้ดูแลระบบ</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => router.push('/admin/branches')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-inset hover:bg-accent/5 hover:ring-1 hover:ring-accent transition-all group/btn">
                      <MapPin className="w-5 h-5 text-accent group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Manage Branches</span>
                   </button>
                   <button onClick={() => router.push('/leader/drivers')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-inset hover:bg-emerald-500/5 hover:ring-1 hover:ring-emerald-500 transition-all group/btn">
                      <Users className="w-5 h-5 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">Manage Drivers</span>
                   </button>
                </div>
              </motion.div>
            )}

            {/* Security Section */}
            {!isRootAdmin && (
               <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                       <Lock className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                       <h2 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-primary)' }}>รหัสผ่าน (Security)</h2>
                       <p className="text-[10px] font-bold text-muted uppercase tracking-widest">ไม่ระบุหากไม่ต้องการเปลี่ยน</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {newPassword && (
                      <div className="relative group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 block px-1 transition-colors group-focus-within/field:text-accent" style={{ color: 'var(--text-muted)' }}>
                          รหัสผ่านปัจจุบัน
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-11 bg-inset rounded-xl px-4 pr-11 text-xs font-bold ring-1 ring-border focus:ring-accent outline-none"
                            placeholder="Current Password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-surface rounded-lg transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted" /> : <Eye className="w-3.5 h-3.5 text-muted" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="group/field">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 block px-1" style={{ color: 'var(--text-muted)' }}>
                            รหัสผ่านใหม่
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-11 bg-inset rounded-xl px-4 text-xs font-bold ring-1 ring-border focus:ring-accent outline-none"
                            placeholder="New (6+ chars)"
                          />
                       </div>
                       <div className="group/field">
                          <label className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 block px-1" style={{ color: 'var(--text-muted)' }}>
                            ยืนยันรหัสผ่าน
                          </label>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 bg-inset rounded-xl px-4 text-xs font-bold ring-1 ring-border focus:ring-accent outline-none"
                            placeholder="Confirm New"
                          />
                       </div>
                    </div>
                  </div>
               </motion.div>
            )}

            {!isRootAdmin && (
               <button 
                 onClick={handleSave} 
                 disabled={saving}
                 className="w-full h-14 rounded-2xl bg-accent text-white font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-6"
               >
                 {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
               </button>
            )}

            {isRootAdmin && (
              <div className="p-10 text-center bg-amber-500/5 rounded-[40px] border border-dashed border-amber-500/20">
                 <Lock className="w-10 h-10 mx-auto mb-4 text-amber-500 opacity-40 shrink-0" />
                 <p className="text-sm font-black text-amber-500 uppercase tracking-tight">Root Administrator Mode</p>
                 <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto mt-2">
                   บัญชีผู้ดูแลระบบหลักถูกกำหนดผ่าน Environment Variables ไม่สามารถแก้ไขผ่านหน้านี้ได้
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
