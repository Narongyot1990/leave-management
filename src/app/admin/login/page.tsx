'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[340px] relative z-10"
      >
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Admin Portal</h1>
          <p className="text-[10px] font-black mt-2 opacity-30 uppercase tracking-[0.4em]" style={{ color: 'var(--text-primary)' }}>Authorized Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-4 rounded-3xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-4"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-16 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-md pl-14 pr-6 text-sm font-bold ring-1 ring-white/10 focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all placeholder:text-slate-500"
              placeholder="Administrator Email"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[var(--accent)] transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-16 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-md pl-14 pr-14 text-sm font-bold ring-1 ring-white/10 focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all placeholder:text-slate-500"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-3xl bg-[var(--accent)] text-white font-black text-xs uppercase tracking-widest shadow-2xl mt-6 relative overflow-hidden"
          >
            {loading ? (
              <div className="w-6 h-6 rounded-full border-3 border-white/20 border-t-white animate-spin mx-auto" />
            ) : (
              'Sign In to Dashboard'
            )}
          </motion.button>
        </form>

        <div className="mt-10 text-center">
          <a
            href="/login"
            className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            Back to User Login
          </a>
        </div>
      </motion.div>

      <div className="absolute bottom-10 opacity-5 pointer-events-none text-center">
        <p className="text-[9px] font-black tracking-[0.5em] uppercase" style={{ color: 'var(--text-primary)' }}>ITL Admin Infrastructure</p>
      </div>
    </div>
  );
}
