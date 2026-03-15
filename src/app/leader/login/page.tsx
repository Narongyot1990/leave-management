'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
        localStorage.setItem('leaderUser', JSON.stringify(data.leader));
        router.push('/leader/home');
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const lightBg = 'linear-gradient(160deg, #ede9fe 0%, #f5f3ff 40%, #ddd6fe 70%, #ede9fe 100%)';
  const darkBg  = 'var(--bg-base)';

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-700"
      style={{ background: isDark ? darkBg : lightBg }}
    >
      {/* Conditional BG FX */}
      {isDark ? (
        <ParticleEmitter
          count={40}
          speed={0.25}
          maxSize={2}
          lineDistance={100}
          colors={['rgba(139,92,246,0.5)', 'rgba(99,102,241,0.4)', 'rgba(168,85,247,0.35)', 'rgba(79,70,229,0.3)']}
        />
      ) : (
        <>
          <SnowEmitter count={100} />
          <div className="absolute top-[-20%] right-[-10%] w-[65vw] h-[65vw] rounded-full opacity-25 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.85), transparent)', zIndex: 1 }} />
        </>
      )}

      {isDark && (
        <>
          <div className="absolute top-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-[0.1] blur-[80px] animate-pulse pointer-events-none" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.07] blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)', animation: 'pulse 4s ease-in-out infinite reverse' }} />
        </>
      )}

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[300px] relative z-10"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: isDark ? 'white' : '#3b0764' }}
          >
            FLS Fleet
          </h1>
          <p
            className="text-[12px] font-medium mt-1"
            style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(59,7,100,0.5)' }}
          >
            เข้าสู่ระบบผู้ดูแล
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-5 space-y-3 backdrop-blur-md"
          style={{
            background: isDark
              ? 'color-mix(in srgb, var(--bg-surface) 85%, transparent)'
              : 'rgba(255,255,255,0.72)',
            border: isDark ? '1px solid var(--border)' : '1px solid rgba(196,181,253,0.5)',
            boxShadow: isDark
              ? '0 8px 40px rgba(0,0,0,0.2)'
              : '0 8px 40px rgba(167,139,250,0.2), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-2.5 rounded-xl text-[11px] font-medium overflow-hidden"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9 text-sm h-10"
              placeholder="อีเมล"
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9 pr-9 text-sm h-10"
              placeholder="รหัสผ่าน"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 6px 28px rgba(124,58,237,0.4)' }}
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
              />
            ) : 'เข้าสู่ระบบ'}
          </motion.button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 text-center"
        >
          <a
            href="/login"
            className="text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(59,7,100,0.4)' }}
          >
            เข้าสู่ระบบด้วย LINE
          </a>
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 1 }}
        className="absolute bottom-5 text-[9px] font-medium tracking-widest uppercase z-10"
        style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(59,7,100,0.4)' }}
      >
        FLS Fleet Management
      </motion.p>
    </div>
  );
}
