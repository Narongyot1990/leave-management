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

  // Light mode: winter/snow theme. Dark mode: deep space particles.
  const lightBg = 'linear-gradient(160deg, #dbeafe 0%, #eff6ff 40%, #bfdbfe 70%, #dbeafe 100%)';
  const darkBg  = 'var(--bg-base)';

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-700"
      style={{ background: isDark ? darkBg : lightBg }}
    >
      {/* Conditional BG FX */}
      {isDark ? (
        <ParticleEmitter count={55} speed={0.3} maxSize={2.5} lineDistance={110} />
      ) : (
        <>
          {/* Snow */}
          <SnowEmitter count={130} />
          {/* Soft winter orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full opacity-30 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, #bfdbfe, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, #93c5fd, transparent 70%)' }} />
          {/* Ground snow */}
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.9), transparent)', zIndex: 1 }} />
        </>
      )}

      {/* Dark mode gradient orbs */}
      {isDark && (
        <>
          <div className="absolute top-[-25%] left-[-15%] w-[65vw] h-[65vw] rounded-full opacity-[0.12] blur-[80px] animate-pulse pointer-events-none" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.08] blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, var(--info) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite reverse' }} />
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
        {/* Title + subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: isDark ? 'white' : '#1e3a5f' }}
          >
            FLS Fleet
          </h1>
          <p
            className="text-[12px] font-medium mt-1"
            style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(30,58,95,0.55)' }}
          >
            ระบบจัดการพนักงานขนส่ง
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-5 backdrop-blur-md"
          style={{
            background: isDark
              ? 'color-mix(in srgb, var(--bg-surface) 85%, transparent)'
              : 'rgba(255,255,255,0.72)',
            border: isDark ? '1px solid var(--border)' : '1px solid rgba(147,197,253,0.5)',
            boxShadow: isDark
              ? '0 8px 40px rgba(0,0,0,0.2)'
              : '0 8px 40px rgba(147,197,253,0.25), 0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 6px 28px rgba(6,199,85,0.4)' }}
            whileTap={{ scale: 0.96 }}
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #06C755 0%, #04B44C 100%)', boxShadow: '0 4px 20px rgba(6,199,85,0.3)' }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white"
              />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d={LINE_ICON_PATH} /></svg>
                <span>เข้าสู่ระบบด้วย LINE</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Admin link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 text-center"
        >
          <a
            href="/leader/login"
            className="text-[11px] font-medium transition-opacity hover:opacity-70"
            style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,58,95,0.45)' }}
          >
            เข้าสู่ระบบสำหรับผู้ดูแล
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom brand */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ delay: 1 }}
        className="absolute bottom-5 text-[9px] font-medium tracking-widest uppercase z-10"
        style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,58,95,0.4)' }}
      >
        FLS Fleet Management
      </motion.p>
    </div>
  );
}
