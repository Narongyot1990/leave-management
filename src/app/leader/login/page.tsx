'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';

export default function AdminLoginPage() {
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
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Particle VFX */}
      <ParticleEmitter
        count={40}
        speed={0.25}
        maxSize={2}
        lineDistance={100}
        colors={['rgba(139,92,246,0.5)', 'rgba(99,102,241,0.4)', 'rgba(168,85,247,0.35)', 'rgba(79,70,229,0.3)']}
      />

      {/* Gradient orbs */}
      <div className="absolute top-[-25%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-[0.1] blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.07] blur-[80px]" style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)', animation: 'pulse 4s ease-in-out infinite reverse' }} />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[300px] relative z-10"
      >
        {/* FLS Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 14 }}
          className="flex justify-center mb-4"
        >
          <Image src="/logo.svg" alt="FLS Group" width={140} height={70} priority className="drop-shadow-lg" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-[11px] font-medium mb-5"
          style={{ color: 'var(--text-muted)' }}
        >
          เข้าสู่ระบบผู้ดูแล
        </motion.p>

        {/* Login Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-5 space-y-3 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Error */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Submit */}
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

        {/* Driver link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 text-center"
        >
          <a
            href="/login"
            className="text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            เข้าสู่ระบบด้วย LINE
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom brand */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="absolute bottom-5 text-[9px] font-medium tracking-widest uppercase z-10"
        style={{ color: 'var(--text-muted)' }}
      >
        FLS Fleet Management
      </motion.p>
    </div>
  );
}
