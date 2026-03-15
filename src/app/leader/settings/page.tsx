'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle2, MapPin, User, Phone, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import LeaderProfile from '@/components/LeaderProfile';

export default function LeaderSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [view, setView] = useState<'settings' | 'profile'>('settings');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          setName(data.user.name || '');
          setSurname(data.user.surname || '');
          setPhone(data.user.phone || '');
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    fetchMe();
  }, [router]);

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
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSaved(true);
        // Update local user state
        setUser({ ...user, name, surname, phone });
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
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
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar role={role} />
        <div className="lg:pl-[240px]">
           <header className="p-4 flex items-center gap-4">
              <button 
                onClick={() => setView('settings')}
                className="w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center"
              >
                 <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-fluid-lg font-black tracking-tighter uppercase">My Profile</h1>
           </header>
           <LeaderProfile user={user} isMe={true} onEditClick={() => setView('settings')} />
        </div>
        <BottomNav role={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[120px]" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={role} />

      <div className="lg:pl-[240px]">
        {/* Simple Page Header */}
        <header className="px-6 pt-10 pb-6">
           <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                   <h1 className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>ตั้งค่าข้อมูล</h1>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-1" style={{ color: 'var(--text-primary)' }}>
                      PERSONAL SETTINGS
                   </p>
                </div>
                <button 
                  onClick={() => setView('profile')}
                  className="w-12 h-12 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center border border-[var(--accent)]/10 text-[var(--accent)]"
                >
                   <User className="w-6 h-6" />
                </button>
              </div>
           </div>
        </header>

        <div className="px-6 max-w-xl mx-auto">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500">บันทึกข้อมูลเรียบร้อย</span>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 mb-6 font-bold text-xs text-rose-500">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Identity Card */}
            <div className="card-neo p-6 space-y-5">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                     <Settings className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Identification</h3>
               </div>

               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-widest px-1 text-[var(--text-muted)]">ชื่อ (Name)</label>
                       <input 
                         type="text" 
                         value={name} 
                         onChange={(e) => setName(e.target.value)}
                         className="w-full h-12 rounded-2xl bg-[var(--bg-inset)] px-4 text-sm font-bold ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                         required
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-widest px-1 text-[var(--text-muted)]">นามสกุล (Surname)</label>
                       <input 
                         type="text" 
                         value={surname} 
                         onChange={(e) => setSurname(e.target.value)}
                         className="w-full h-12 rounded-2xl bg-[var(--bg-inset)] px-4 text-sm font-bold ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                         required
                       />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase tracking-widest px-1 text-[var(--text-muted)]">เบอร์โทรศัพท์ (Phone)</label>
                     <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] opacity-50" />
                        <input 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-12 rounded-2xl bg-[var(--bg-inset)] pl-12 pr-4 text-sm font-bold ring-1 ring-[var(--border)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                          placeholder="Phone number"
                        />
                     </div>
                  </div>
               </div>
            </div>

            {/* Workplace Card */}
            <div className="card-neo p-6">
               <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                     <MapPin className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Work Location</h3>
               </div>
               <div className="p-4 rounded-2xl bg-[var(--bg-inset)] border border-[var(--border)]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Assigned Branch</p>
                  <p className="text-2xl font-black text-amber-500">{user.branch || (role === 'admin' ? 'SYSTEM (ALL)' : 'PENDING')}</p>
               </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-14 rounded-2xl bg-[var(--accent)] text-white font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </form>
        </div>
      </div>

      <BottomNav role={role} />
    </div>
  );
}
