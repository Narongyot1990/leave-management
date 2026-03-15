'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';

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
        
        if (sessionUser.role === 'admin') {
          router.push('/admin/home');
        } else {
          router.push('/leader/home');
        }
      } else {
        setError(data.error || 'ข้อมูลประจำตัวไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  // Midnight Pro: Deep Navy to Black
  const pageBg = 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)';

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-200"
      style={{ background: pageBg }}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Dynamic BG Decor */}
      <ParticleEmitter
        count={60}
        speed={0.15}
        maxSize={2}
        lineDistance={120}
        colors={['rgba(99,102,241,0.2)', 'rgba(6,182,212,0.1)']}
      />

      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-[120px] pointer-events-none" 
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }} 
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px] relative"
      >
        {/* Decorative Frame */}
        <div className="absolute inset-0 -m-[1px] rounded-[33px] bg-gradient-to-br from-indigo-500/30 via-transparent to-cyan-500/30 p-[1px] opacity-50 shadow-[0_0_50px_rgba(79,70,229,0.15)]" />

        <div 
          className="relative rounded-[32px] overflow-hidden border border-white/5 shadow-2xl"
          style={{ 
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(24px) saturate(180%)',
          }}
        >
          {/* Top Banner Area */}
          <div className="h-24 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 border-b border-white/5">
              <div className="absolute inset-0 bg-grid-white/[0.02]" />
              <ShieldCheck className="w-10 h-10 text-indigo-400 opacity-80" />
          </div>

          <div className="p-8 pt-10">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black tracking-tight text-white mb-2">
                ADMIN LOGIN
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Authorized Personnel Only
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 rounded-2xl bg-slate-900/50 border border-white/10 pl-12 pr-4 text-white font-bold outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 rounded-2xl bg-slate-900/50 border border-white/10 pl-12 pr-12 text-white font-bold outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ y: -2, boxShadow: '0 10px 30px -5px rgba(79, 70, 229, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all"
              >
                {loading ? (
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
               <a 
                 href="/login"
                 className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-2"
               >
                 <div className="w-1.5 h-1.5 rounded-full bg-[#06C755]" />
                 กลับไปหน้าเข้าสู่ระบบ LINE
               </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center opacity-40">
           <p className="text-[9px] font-black tracking-[0.4em] uppercase">ITL FLEET MANAGEMENT</p>
        </div>
      </motion.div>
    </div>
  );
}
