'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';
import { Truck, ShieldCheck, ArrowRight } from 'lucide-react';

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
          <div className="h-32 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 border-b border-white/5">
              <div className="absolute inset-0 bg-grid-white/[0.02]" />
              <Truck className="w-12 h-12 text-indigo-400 opacity-80" />
          </div>

          <div className="p-8 pt-10">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                ITL FLEET
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                Driver Entry Portal
              </p>
            </div>

            <p className="text-center text-[11px] font-bold text-slate-400 mb-10 leading-relaxed px-6">
              เข้าสู่ระบบด้วย LINE เพื่อเข้าถึงงาน <br/> และจัดการรอบการขนส่งของคุณ
            </p>

            <motion.button
              whileHover={{ y: -4, scale: 1.02, boxShadow: '0 20px 40px -10px rgba(6, 199, 85, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLineLogin}
              disabled={loading}
              className="w-full h-16 rounded-[24px] text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-[#06C755]/10 flex items-center justify-center gap-4 group"
              style={{ background: 'linear-gradient(135deg, #06C755 0%, #04B44C 100%)' }}
            >
              {loading ? (
                <div className="w-6 h-6 rounded-full border-3 border-white/20 border-t-white animate-spin" />
              ) : (
                <>
                  <svg className="w-7 h-7 transition-transform group-active:scale-90" viewBox="0 0 24 24" fill="currentColor"><path d={LINE_ICON_PATH} /></svg>
                  <span>Login with LINE</span>
                </>
              )}
            </motion.button>

            <div className="mt-12 pt-8 border-t border-white/5 text-center">
               <a 
                 href="/leader/login"
                 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-indigo-400 transition-colors inline-flex items-center gap-2"
               >
                 <ShieldCheck className="w-3.5 h-3.5" />
                 Authorized Staff Support
               </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 opacity-30">
           <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" />
           <p className="text-[9px] font-black tracking-[0.5em] text-white uppercase italic">FLS FLEET COMMAND</p>
        </div>
      </motion.div>
    </div>
  );
}
