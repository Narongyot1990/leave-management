'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ShieldCheck as Shield, Mail as MailIcon, Lock as LockIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, AlertCircle as AlertIcon } from 'lucide-react';

import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';
import SnowEmitter from '@/components/SnowEmitter';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

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
        const sessionUser = data.user || data.leader;
        localStorage.setItem('leaderUser', JSON.stringify(sessionUser));
        
        if (sessionUser?.role === 'admin') {
          router.push('/admin/home');
        } else {
          // If a leader tries to login via email/pass, redirect them to LINE login if not authorized here
          // But usually, only admin_root has email/pass in this system
          router.push('/leader/home');
        }
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-700"
      style={{ background: isDark ? 'var(--bg-base)' : 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)' }}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Effects Layer */}
      {isDark ? (
        <ParticleEmitter count={40} speed={0.15} maxSize={2} lineDistance={120} colors={['rgba(99,102,241,0.2)']} />
      ) : (
        <SnowEmitter count={60} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[360px] relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex w-20 h-20 rounded-[28px] items-center justify-center text-white shadow-2xl mb-6"
            style={{ background: 'var(--accent)', boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.6)' : 'var(--shadow-accent)' }}
          >
            <Shield className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Admin Portal</h1>
          <p className="text-[10px] font-black mt-2 opacity-30 uppercase tracking-[0.4em]" style={{ color: 'var(--text-primary)' }}>Secure Access Only</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="card-neo p-8 space-y-5 backdrop-blur-xl"
          style={{ 
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.7)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'
          }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl text-xs font-bold"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertIcon className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-12 h-14 rounded-2xl font-bold bg-white/50 dark:bg-black/20"
              placeholder="Administrator Email"
              required
            />
          </div>

          <div className="relative group">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-[var(--accent)]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-12 pr-12 h-14 rounded-2xl font-bold bg-white/50 dark:bg-black/20"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
          >
            {loading ? (
              <div className="w-6 h-6 rounded-full border-3 border-white/20 border-t-white animate-spin" />
            ) : 'Sign In'}
          </motion.button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/login"
            className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            Back to LINE Login
          </a>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-center opacity-10 pointer-events-none">
        <p className="text-[9px] font-black tracking-[0.5em] uppercase" style={{ color: 'var(--text-primary)' }}>ITL Admin v7.0</p>
      </div>
    </div>
  );
}
