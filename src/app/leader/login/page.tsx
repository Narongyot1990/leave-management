<<<<<<< D:/projects/ITL/drivers/src/app/leader/login/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LeaderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/leader-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('leaderUser', JSON.stringify(data.leader));
        router.push('/leader/home');
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[360px]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="flex justify-center mb-6"
        >
          <div
            className="w-16 h-16 rounded-[var(--radius-lg)] flex items-center justify-center text-white"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-accent)' }}
          >
            <ShieldCheck className="w-8 h-8" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center mb-6">
          <h1 className="text-fluid-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Leader Portal</h1>
          <p className="text-fluid-sm mt-1" style={{ color: 'var(--text-muted)' }}>เข้าสู่ระบบสำหรับหัวหน้างาน</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-neo p-6 space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="อีเมล"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="รหัสผ่าน"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                กำลังเข้าสู่ระบบ...
              </span>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </motion.form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center">
          <a href="/login" className="text-fluid-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
            สำหรับพนักงานขับรถ
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
=======
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';

export default function LeaderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/leader-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('leaderUser', JSON.stringify(data.leader));
        router.push('/leader/home');
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Particle VFX Background */}
      <ParticleEmitter
        count={35}
        speed={0.25}
        maxSize={2}
        lineDistance={110}
        colors={[
          'rgba(79,70,229,0.5)',
          'rgba(139,92,246,0.4)',
          'rgba(168,85,247,0.35)',
          'rgba(129,140,248,0.3)',
        ]}
      />

      {/* Gradient Orbs */}
      <div className="absolute top-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full opacity-15 blur-3xl animate-float" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', animation: 'float 5s ease-in-out infinite reverse' }} />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] relative z-10"
      >
        {/* Logo with glow */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mb-5"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ background: 'var(--accent)' }} />
            <div
              className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', boxShadow: '0 8px 32px var(--accent-glow)' }}
            >
              <ShieldCheck className="w-9 h-9" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center mb-6"
        >
          <h1 className="text-fluid-3xl font-extrabold tracking-tight gradient-text">Leader Portal</h1>
          <p className="text-fluid-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>เข้าสู่ระบบสำหรับหัวหน้างาน</p>
        </motion.div>

        {/* Login Card — Glass */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-6 space-y-4 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px var(--border)',
          }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl text-fluid-xs font-medium overflow-hidden"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="อีเมล"
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 pr-10"
              placeholder="รหัสผ่าน"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
              style={{ color: 'var(--text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-50 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #8B5CF6)',
              boxShadow: '0 4px 20px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <span>เข้าสู่ระบบ</span>
            )}
          </motion.button>
        </motion.form>

        {/* Driver link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 text-center"
        >
          <a
            href="/login"
            className="inline-flex items-center gap-1 text-fluid-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            สำหรับพนักงานขับรถ
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom branding */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-6 text-[10px] font-medium tracking-wider uppercase z-10"
        style={{ color: 'var(--text-muted)', opacity: 0.5 }}
      >
        ITL Fleet Management System
      </motion.p>
    </div>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/leader/login/page.tsx
