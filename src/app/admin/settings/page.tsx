'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MapPin, User, Phone, Save, ArrowLeft, Loader2, CreditCard, ShieldCheck } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import ProfileOverview from '@/components/AdminProfile';
import { useAdminSession } from '@/hooks/useAdminSession';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'profile' ? 'profile' : 'settings';
  const { user: sessionUser } = useAdminSession();
  const [user, setUser] = useState<any>(null);
  const role = 'admin' as const;
  const [view, setView] = useState<'settings' | 'profile'>(initialView);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    setView(searchParams.get('view') === 'profile' ? 'profile' : 'settings');
  }, [searchParams]);

  useEffect(() => {
    if (!sessionUser) return;
    setUser(sessionUser);
    setName(sessionUser.name || '');
    setSurname(sessionUser.surname || '');
    setPhone(sessionUser.phone || '');
    setEmployeeId(sessionUser.employeeId || '');
  }, [sessionUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      const res = await fetch('/api/auth/leader-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaderId: user.id || user._id,
          name,
          surname,
          phone,
          employeeId,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSaved(true);
        setUser({ ...user, name, surname, phone, employeeId });
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
    </div>
  );

  if (view === 'profile') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <Sidebar role={role} />
        <div className="lg:pl-[240px]">
           <header className="px-4 py-4 flex items-center justify-between">
              <button 
                onClick={() => setView('settings')}
                className="w-10 h-10 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] flex items-center justify-center"
              >
                 <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-black tracking-tighter uppercase opacity-30">My Profile</h1>
              <div className="w-10" /> 
           </header>
           <ProfileOverview user={user} isMe={true} onEditClick={() => setView('settings')} />
        </div>
        <BottomNav role={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[120px]" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px]">
        {/* Compact Page Header */}
        <header className="px-6 pt-8 pb-4">
           <div className="max-w-xl mx-auto flex items-center justify-between">
              <div>
                 <h1 className="text-2xl font-black tracking-tighter">ตั้งค่าข้อมูล</h1>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Personal Settings</p>
              </div>
              <button 
                onClick={() => setView('profile')}
                className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center border border-[var(--accent)]/10 text-[var(--accent)] shadow-sm"
              >
                 <User className="w-5 h-5" />
              </button>
           </div>
        </header>

        <main className="px-6 max-w-xl mx-auto">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">บันทึกข้อมูลเรียบร้อย</span>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-4 font-bold text-[11px] text-rose-500">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Essential Info Card */}
            <div className="card-neo p-5 space-y-4">
               <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Identity Information</h3>
               </div>

               <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">ชื่อ</label>
                       <input 
                         type="text" 
                         value={name} 
                         onChange={(e) => setName(e.target.value)}
                         className="w-full h-11 rounded-xl bg-[var(--bg-inset)] px-4 text-sm font-bold border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all"
                         required
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">นามสกุล</label>
                       <input 
                         type="text" 
                         value={surname} 
                         onChange={(e) => setSurname(e.target.value)}
                         className="w-full h-11 rounded-xl bg-[var(--bg-inset)] px-4 text-sm font-bold border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all"
                         required
                       />
                    </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">รหัสพนักงาน (Employee ID)</label>
                     <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-30" />
                        <input 
                          type="text" 
                          value={employeeId} 
                          onChange={(e) => setEmployeeId(e.target.value)}
                          className="w-full h-11 rounded-xl bg-[var(--bg-inset)] pl-11 pr-4 text-sm font-bold border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all"
                          placeholder="Employee ID"
                        />
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] px-1">เบอร์โทรศัพท์</label>
                     <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-30" />
                        <input 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-11 rounded-xl bg-[var(--bg-inset)] pl-11 pr-4 text-sm font-bold border border-[var(--border)] focus:border-[var(--accent)] outline-none transition-all"
                          placeholder="Mobile number"
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Compact Workplace Card */}
            <div className="card-neo p-4 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                     <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Branch Scope</h3>
                    <p className="text-sm font-black">{user.branch || (role === 'admin' ? 'SYSTEM (ALL)' : 'PENDING')}</p>
                  </div>
               </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="w-full h-14 rounded-2xl bg-[var(--accent)] text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 mt-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </motion.button>
          </form>
        </main>
      </div>

      <BottomNav role={role} />
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}


