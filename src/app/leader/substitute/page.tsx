<<<<<<< D:/projects/ITL/drivers/src/app/leader/substitute/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { RECORD_TYPES } from '@/lib/leave-types';
import { usePusher } from '@/hooks/usePusher';

interface User {
  _id: string;
  lineDisplayName: string;
  name?: string;
  surname?: string;
  employeeId?: string;
  status: string;
}

const BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];

export default function SubstitutePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [recordType, setRecordType] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          if (data.user.role === 'admin') {
            setSelectedBranch('all');
          } else {
            setSelectedBranch(data.user.branch || 'all');
          }
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      params.set('activeOnly', 'true');
      if (role === 'admin' && selectedBranch !== 'all') {
        params.set('branch', selectedBranch);
      } else if (role === 'leader' && user?.branch) {
        params.set('branch', user.branch);
      }
      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user, role, selectedBranch]);

  // Pusher realtime — refresh user list on driver changes
  const handleUserChanged = useCallback(async () => {
    fetchUsers();
  }, [role, selectedBranch, user]);

  usePusher('users', [
    { event: 'driver-activated', callback: handleUserChanged },
    { event: 'driver-updated', callback: handleUserChanged },
  ], !!user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUser || !recordType || !date) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/substitute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          recordType,
          date,
          description,
          createdBy: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/leader/home');
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
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="บันทึกการแทน" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            
            {/* Branch Filter for Admin */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {BRANCHES.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </motion.div>
            )}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="card p-5 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>บันทึกสำเร็จ!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Select Driver */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>เลือกพนักงาน</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="input" required>
                <option value="">-- เลือกพนักงาน --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.surname} {u.employeeId ? `(${u.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Record Type */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>ประเภทการบันทึก</label>
              <div className="grid grid-cols-2 gap-2">
                {RECORD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRecordType(type.value)}
                    className="min-h-[44px] py-2.5 px-3 rounded-[var(--radius-md)] text-fluid-sm transition-all text-left"
                    style={{
                      background: recordType === type.value ? 'var(--accent-light)' : 'var(--bg-inset)',
                      color: recordType === type.value ? 'var(--accent)' : 'var(--text-primary)',
                      border: recordType === type.value ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      fontWeight: recordType === type.value ? 600 : 500,
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Date & Description Form */}
            <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5 space-y-4">
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>วันที่</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>หมายเหตุ (ถ้ามี)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="ระบุรายละเอียด..." />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    บันทึก
                  </span>
                )}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
=======
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { RECORD_TYPES } from '@/lib/leave-types';
import { usePusher } from '@/hooks/usePusher';

interface User {
  _id: string;
  lineDisplayName: string;
  name?: string;
  surname?: string;
  employeeId?: string;
  status: string;
}

const BRANCHES = ['AYA', 'CBI', 'RA2', 'KSN', 'BBT'];

export default function SubstitutePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'leader' | 'admin'>('leader');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [recordType, setRecordType] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          setRole(data.user.role || 'leader');
          if (data.user.role === 'admin') {
            setSelectedBranch('all');
          } else {
            setSelectedBranch(data.user.branch || 'all');
          }
        } else {
          router.push('/leader/login');
        }
      } catch {
        router.push('/leader/login');
      }
    };
    fetchMe();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      params.set('activeOnly', 'true');
      if (role === 'admin' && selectedBranch !== 'all') {
        params.set('branch', selectedBranch);
      } else if (role === 'leader' && user?.branch) {
        params.set('branch', user.branch);
      }
      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUsers();
  }, [user, role, selectedBranch]);

  // Pusher realtime — refresh user list on driver changes
  const handleUserChanged = useCallback(async () => {
    fetchUsers();
  }, [role, selectedBranch, user]);

  usePusher('users', [
    { event: 'driver-activated', callback: handleUserChanged },
    { event: 'driver-updated', callback: handleUserChanged },
  ], !!user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUser || !recordType || !date) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/substitute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          recordType,
          date,
          description,
          createdBy: user?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/leader/home');
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
      <Sidebar role={role} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="บันทึกการแทน" backHref="/leader/home" />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto space-y-4">
            
            {/* Branch Filter for Admin */}
            {role === 'admin' && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedBranch('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  ทุกสาขา
                </button>
                {BRANCHES.map(b => (
                  <button
                    key={b}
                    onClick={() => setSelectedBranch(b)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                  >
                    สาขา {b}
                  </button>
                ))}
              </motion.div>
            )}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="card p-5 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>บันทึกสำเร็จ!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Select Driver */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>เลือกพนักงาน</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="input" required>
                <option value="">-- เลือกพนักงาน --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} {u.surname} {u.employeeId ? `(${u.employeeId})` : ''}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Record Type */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="card p-5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>ประเภทการบันทึก</label>
              <div className="grid grid-cols-2 gap-2">
                {RECORD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRecordType(type.value)}
                    className="min-h-[44px] py-2.5 px-3 rounded-[var(--radius-md)] text-fluid-sm transition-all text-left"
                    style={{
                      background: recordType === type.value ? 'var(--accent-light)' : 'var(--bg-inset)',
                      color: recordType === type.value ? 'var(--accent)' : 'var(--text-primary)',
                      border: recordType === type.value ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      fontWeight: recordType === type.value ? 600 : 500,
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Date & Description Form */}
            <motion.form onSubmit={handleSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="card p-5 space-y-4">
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>วันที่</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>หมายเหตุ (ถ้ามี)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="ระบุรายละเอียด..." />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    บันทึก
                  </span>
                )}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/leader/substitute/page.tsx
