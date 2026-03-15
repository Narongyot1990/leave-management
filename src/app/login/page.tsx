<<<<<<< D:/projects/ITL/drivers/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[360px]"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="flex justify-center mb-6"
        >
          <div
            className="w-16 h-16 rounded-[var(--radius-lg)] flex items-center justify-center text-white"
            style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-accent)' }}
          >
            <Truck className="w-8 h-8" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-fluid-2xl font-bold" style={{ color: 'var(--text-primary)' }}>ITL Drivers</h1>
          <p className="text-fluid-sm mt-1" style={{ color: 'var(--text-muted)' }}>ระบบจัดการลาพนักงาน</p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-neo p-6"
        >
          <button
            onClick={handleLineLogin}
            disabled={loading}
            className="btn w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold py-3.5 rounded-[var(--radius-md)] transition-all disabled:opacity-50"
            style={{ boxShadow: '0 4px 14px rgba(6,199,85,0.3)' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                เข้าสู่ระบบด้วย LINE
              </span>
            )}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <a href="/leader/login" className="text-fluid-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
            สำหรับหัวหน้างาน
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
=======
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, ChevronRight } from 'lucide-react';
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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Particle VFX Background */}
      <ParticleEmitter count={50} speed={0.3} maxSize={2.5} lineDistance={100} />

      {/* Gradient Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-3xl animate-float" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, var(--info) 0%, transparent 70%)', animation: 'float 4s ease-in-out infinite reverse' }} />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[340px] relative z-10"
      >
        {/* Logo with glow */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mb-5"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ background: 'var(--accent)' }} />
            <div
              className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-white animate-pulse-glow"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', boxShadow: '0 8px 32px var(--accent-glow)' }}
            >
              <Truck className="w-9 h-9" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-center mb-7"
        >
          <h1 className="text-fluid-3xl font-extrabold tracking-tight gradient-text">ITL Drivers</h1>
          <p className="text-fluid-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>ระบบจัดการลาพนักงานขับรถ</p>
        </motion.div>

        {/* Login Card — Glass */}
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl p-6 backdrop-blur-md"
          style={{
            background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px var(--border)',
          }}
        >
          <p className="text-fluid-xs font-semibold text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
            เข้าสู่ระบบเพื่อเริ่มใช้งาน
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-50 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #06C755 0%, #04B44C 100%)',
              boxShadow: '0 4px 20px rgba(6,199,85,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d={LINE_ICON_PATH} />
                </svg>
                <span>เข้าสู่ระบบด้วย LINE</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Leader link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 text-center"
        >
          <a
            href="/leader/login"
            className="inline-flex items-center gap-1 text-fluid-xs font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            สำหรับหัวหน้างาน
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom branding */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-6 text-[10px] font-medium tracking-wider uppercase z-10"
        style={{ color: 'var(--text-muted)', opacity: 0.5 }}
      >
        ITL Fleet Management System
      </motion.p>
    </div>
  );
}
>>>>>>> C:/Users/Narongyot.B/.windsurf/worktrees/drivers/drivers-244b8337/src/app/login/page.tsx
