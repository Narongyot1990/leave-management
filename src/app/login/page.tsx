'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ThemeToggle from '@/components/ThemeToggle';
import ParticleEmitter from '@/components/ParticleEmitter';
import SnowEmitter from '@/components/SnowEmitter';
import { Truck } from 'lucide-react';

const LINE_ICON_PATH = 'M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314zM8.377 14.308c0 .245-.199.444-.444.444H5.47c-.245 0-.444-.199-.444-.444V9.61c0-.245.2-.444.444-.444.245 0 .444.199.444.444v4.254h2.019c.245 0 .444.199.444.444zm1.905 0c0 .245-.2.444-.444.444-.245 0-.444-.199-.444-.444V9.61c0-.245.199-.444.444-.444s.444.199.444.444v4.698zm5.203 0c0 .191-.123.36-.305.421-.045.015-.094.022-.14.022-.149 0-.276-.063-.36-.177l-1.718-2.333v2.067c0 .245-.197.444-.444.444s-.441-.199-.441-.444V9.61c0-.191.121-.36.303-.42.042-.016.101-.023.137-.023.137 0 .264.073.348.179l1.731 2.342V9.61c0-.245.199-.444.444-.444s.444.2,.444.444v4.698zm3.652-2.122c.246 0 .444.199.444.444 0 .243-.198.444-.444.444h-1.234v.791h1.234c.246 0 .444.199.444.444 0 .242-.198.443-.444.443h-1.678c-.243 0-.441-.201-.441-.443V9.61c0-.245.198-.444.441-.444h1.678c.246 0 .444.199.444.444 0 .245-.198.444-.444.444h-1.234v.791h1.234z';

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

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-700"
      style={{ background: isDark ? 'var(--bg-base)' : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Effects Layer */}
      {isDark ? (
        <ParticleEmitter count={40} speed={0.15} maxSize={2} lineDistance={100} colors={['rgba(6, 199, 85, 0.2)']} />
      ) : (
        <SnowEmitter count={60} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[320px] relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex w-20 h-20 rounded-[28px] items-center justify-center text-white shadow-2xl mb-6"
            style={{ background: 'var(--accent)', boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.6)' : 'var(--shadow-accent)' }}
          >
            <Truck className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>ITL Drivers</h1>
          <p className="text-[10px] font-black mt-2 opacity-30 uppercase tracking-[0.4em]" style={{ color: 'var(--text-primary)' }}>Fleet Management</p>
        </div>

        <div className="space-y-6">
          <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full h-16 rounded-[24px] text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, #06C755 0%, #04B44C 100%)' }}
          >
            {loading ? (
              <div className="w-6 h-6 rounded-full border-3 border-white/20 border-t-white animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d={LINE_ICON_PATH} /></svg>
                <span>Login with LINE</span>
              </>
            )}
          </motion.button>

          <div className="text-center">
            <a
              href="/leader/login"
              className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
            >
              Sign in as Administrator
            </a>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-center opacity-10 pointer-events-none">
        <p className="text-[9px] font-black tracking-[0.5em] uppercase" style={{ color: 'var(--text-primary)' }}>FLS Fleet v7.0</p>
      </div>
    </div>
  );
}
