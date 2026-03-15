'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
        if (data.leader.role === 'admin') {
          router.push('/admin/home');
        } else {
          router.push('/leader/home');
        }
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  // Snow Theme: Silver gradients, soft shadow, glass effect
  const lightBg = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%, #f8fafc 100%)';
  const darkBg  = 'var(--bg-base)';

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-1000"
      style={{ background: isDark ? darkBg : lightBg }}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background FX */}
      {isDark ? (
        <ParticleEmitter
          count={50}
          speed={0.2}
          maxSize={2}
          lineDistance={110}
          colors={['rgba(99,102,241,0.3)', 'rgba(139,92,246,0.2)']}
        />
      ) : (
        <>
          <SnowEmitter count={120} />
          {/* Frosted winter orbs */}
          <motion.div 
            animate={{ 
              x: [0, 20, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1] 
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full opacity-40 blur-[130px] pointer-events-none" 
            style={{ background: 'radial-gradient(circle, #f1f5f9, #cbd5e1 60%)' }} 
          />
          <motion.div 
            animate={{ 
              x: [0, -20, 0],
              y: [0, 30, 0],
              scale: [1, 0.9, 1] 
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full opacity-30 blur-[120px] pointer-events-none" 
            style={{ background: 'radial-gradient(circle, #e2e8f0, #94a3b8 60%)' }} 
          />
        </>
      )}

      {/* Login Frame - Styled Border Effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] relative mt-[-40px]"
      >
        {/* The Frame Decor */}
        <div className="absolute inset-0 -m-1.5 rounded-[32px] overflow-hidden p-[1px] opacity-40">
           <div className={`w-full h-full rounded-[30px] ${isDark ? 'bg-gradient-to-br from-indigo-500 via-transparent to-indigo-500' : 'bg-gradient-to-br from-slate-400 via-white to-slate-400'}`} />
        </div>

        {/* Main Content Card */}
        <div 
          className="relative px-7 py-9 rounded-[28px] backdrop-blur-3xl shadow-2xl overflow-hidden"
          style={{ 
            background: isDark 
              ? 'rgba(15, 23, 42, 0.85)' 
              : 'rgba(255, 255, 255, 0.7)',
            border: isDark 
              ? '1px solid rgba(255,255,255,0.08)' 
              : '1px solid rgba(255,255,255,0.4)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(99, 102, 241, 0.05)'
              : '0 25px 60px -15px rgba(100, 116, 139, 0.2), inset 0 0 30px rgba(255,255,255,0.5)'
          }}
        >
          {/* Icon Header */}
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8 }}
              className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-4 transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
              }}
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
              Admin Portal
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-40">
              Authorized Personnel Only
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl text-[11px] font-black uppercase flex items-center gap-2.5 overflow-hidden"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] ml-1 opacity-40">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors group-focus-within:text-indigo-500" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-inset/50 rounded-2xl pl-11 pr-4 text-sm font-bold border-none ring-1 ring-border focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-muted/30"
                  placeholder="admin@itlfleet.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Password</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors group-focus-within:text-indigo-500" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-inset/50 rounded-2xl pl-11 pr-11 text-sm font-bold border-none ring-1 ring-border focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-muted/30"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted" /> : <Eye className="w-3.5 h-3.5 text-muted" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-3 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  SIGN IN
                  <ShieldCheck className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Social / Other link */}
          <div className="mt-8 pt-8 border-t border-border/30 text-center">
             <p className="text-[9px] font-black uppercase tracking-widest text-muted/60 mb-4">Or sign in with</p>
             <button 
               onClick={() => router.push('/login')}
               className="w-full h-12 rounded-2xl bg-[#06C755]/10 text-[#06C755] font-black text-[10px] uppercase tracking-widest border border-[#06C755]/20 hover:bg-[#06C755] hover:text-white transition-all flex items-center justify-center gap-2"
             >
                Login with LINE
             </button>
          </div>
        </div>

        {/* Footer brand */}
        <div className="mt-8 flex flex-col items-center gap-1 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
           <p className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: isDark ? 'white' : 'black' }}>ITL LOGISTICS</p>
           <div className="w-12 h-[1.5px] bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
