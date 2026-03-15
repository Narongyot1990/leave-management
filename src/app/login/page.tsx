'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';
import SnowEmitter from '@/components/SnowEmitter';

const LINE_ICON_PATH =
  'M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const handleLineLogin = () => {
    setLoading(true);
    const lineChannelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
    const redirectUri = window.location.origin + '/login/callback';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: lineChannelId || '',
      redirect_uri: redirectUri,
      scope: 'openid profile',
      state: 'driver_login',
    });
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
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
          maxSize={2.5}
          lineDistance={110}
          colors={['rgba(6, 199, 85, 0.2)', 'rgba(56, 189, 248, 0.1)']}
        />
      ) : (
        <>
          <SnowEmitter count={120} />
          <motion.div 
            animate={{ 
              x: [0, 20, 0],
              y: [0, -30, 0],
              scale: [1, 1.1, 1] 
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full opacity-40 blur-[130px] pointer-events-none" 
            style={{ background: 'radial-gradient(circle, #f1f5f9, #cbd5e1 60%)' }} 
          />
          <motion.div 
            animate={{ 
              x: [0, -20, 0],
              y: [0, 30, 0],
              scale: [1, 0.9, 1] 
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] rounded-full opacity-30 blur-[120px] pointer-events-none" 
            style={{ background: 'radial-gradient(circle, #e2e8f0, #94a3b8 60%)' }} 
          />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] relative mt-[-20px]"
      >
        {/* The Frame Decor */}
        <div className="absolute inset-0 -m-1.5 rounded-[32px] overflow-hidden p-[1px] opacity-40">
           <div className={`w-full h-full rounded-[30px] ${isDark ? 'bg-gradient-to-br from-[#06C755] via-transparent to-[#06C755]' : 'bg-gradient-to-br from-slate-400 via-white to-slate-400'}`} />
        </div>

        {/* Main Content Card */}
        <div 
          className="relative px-7 py-10 rounded-[28px] backdrop-blur-3xl shadow-2xl overflow-hidden text-center"
          style={{ 
            background: isDark 
              ? 'rgba(15, 23, 42, 0.85)' 
              : 'rgba(255, 255, 255, 0.7)',
            border: isDark 
              ? '1px solid rgba(255,255,255,0.08)' 
              : '1px solid rgba(255,255,255,0.4)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(6, 199, 85, 0.05)'
              : '0 25px 60px -15px rgba(100, 116, 139, 0.2), inset 0 0 30px rgba(255,255,255,0.5)'
          }}
        >
          {/* Brand Logo / Avatar placeholder */}
          <div className="flex flex-col items-center mb-8">
            <motion.div 
               whileHover={{ scale: 1.1 }}
               className="w-20 h-20 rounded-[26px] bg-gradient-to-br from-indigo-50 to-white shadow-inner flex items-center justify-center border border-slate-100 mb-5 overflow-hidden"
            >
               <img src="/logo-placeholder.png" alt="Fleet Logo" className="w-12 h-12 grayscale opacity-80" onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-2xl font-black text-indigo-900/20">FLS</div>';
               }} />
            </motion.div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
              FLS Fleet
            </h1>
            <p className="text-[12px] font-bold uppercase tracking-[0.25em] mt-2 opacity-40">
              Driver Portal
            </p>
          </div>

          <p className="text-xs font-medium text-muted/60 mb-8 leading-relaxed max-w-[200px] mx-auto">
            เข้าสู่ระบบเพื่อเข้าถึงแผนงาน <br/> และจัดการรอบการขนส่งของคุณ
          </p>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#06C755]/20 hover:shadow-[#06C755]/40 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #06C755 0%, #04B44C 100%)' }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d={LINE_ICON_PATH} /></svg>
                <span>Login with LINE</span>
              </>
            )}
          </motion.button>

          <div className="mt-8 pt-8 border-t border-border/30">
            <a
              href="/leader/login"
              className="text-[11px] font-black uppercase tracking-widest transition-all hover:text-indigo-500 opacity-40 hover:opacity-100"
              style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            >
              Sign in as Staff
            </a>
          </div>
        </div>

        {/* Bottom brand */}
        <div className="mt-10 flex flex-col items-center gap-1 opacity-20 grayscale hover:grayscale-0 transition-all cursor-default">
           <p className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: isDark ? 'white' : 'black' }}>FLS Fleet Management</p>
           <div className="w-16 h-[1.5px] bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
