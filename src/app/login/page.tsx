'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';

const LINE_ICON_PATH =
  'M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Particle VFX */}
      <ParticleEmitter count={55} speed={0.3} maxSize={2.5} lineDistance={110} />

      {/* Gradient orbs */}
      <div className="absolute top-[-25%] left-[-15%] w-[65vw] h-[65vw] rounded-full opacity-[0.12] blur-[80px] animate-pulse" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.08] blur-[80px]" style={{ background: 'radial-gradient(circle, var(--info) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite reverse' }} />

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
          <Image src="/logo.svg" alt="FLS Group" width={160} height={80} priority className="drop-shadow-lg" />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center text-fluid-xs font-medium mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          ระบบจัดการพนักงานขนส่ง
        </motion.p>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-5 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 85%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
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
            style={{ color: 'var(--text-muted)' }}
          >
            เข้าสู่ระบบสำหรับผู้ดูแล
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
