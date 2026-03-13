'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle2, MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

const BRANCHES = ['AYA', 'CBI', 'KSN', 'RA2', 'BBT'];

export default function LeaderSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeBranches, setActiveBranches] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) { router.push('/leader/login'); return; }
    setUser(JSON.parse(storedUser));

    const storedBranches = localStorage.getItem('leaderBranches');
    if (storedBranches) {
      setActiveBranches(JSON.parse(storedBranches));
    } else {
      setActiveBranches([...BRANCHES]);
    }
  }, [router]);

  const toggleBranch = (branch: string) => {
    setActiveBranches(prev =>
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('leaderBranches', JSON.stringify(activeBranches));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectAll = () => {
    setActiveBranches([...BRANCHES]);
    setSaved(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader title="ตั้งค่า" backHref="/leader/home" />

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

            {/* Branch filter */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-fluid-sm font-bold" style={{ color: 'var(--text-primary)' }}>สาขาที่ดูแล</h2>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>เลือกสาขาที่ต้องการแสดงข้อมูลพนักงาน</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3 mb-4">
                {BRANCHES.map((branch) => {
                  const isActive = activeBranches.includes(branch);
                  return (
                    <motion.button
                      key={branch}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleBranch(branch)}
                      className="aspect-square flex flex-col items-center justify-center rounded-[var(--radius-md)] transition-all font-bold text-fluid-sm"
                      style={{
                        background: isActive ? 'var(--accent)' : 'var(--bg-inset)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
                        border: isActive ? 'none' : '2px solid var(--border)',
                      }}
                    >
                      <MapPin className="w-4 h-4 mb-1" />
                      {branch}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-fluid-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                <span>เลือกแล้ว {activeBranches.length} / {BRANCHES.length} สาขา</span>
                <button onClick={selectAll} className="font-medium" style={{ color: 'var(--accent)' }}>
                  เลือกทั้งหมด
                </button>
              </div>

              <button onClick={handleSave} className="btn btn-primary w-full">
                <Settings className="w-4 h-4" />
                บันทึกการตั้งค่า
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />
    </div>
  );
}
