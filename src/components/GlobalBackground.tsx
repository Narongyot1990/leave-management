'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import ParticleEmitter from './ParticleEmitter';
import SnowEmitter from './SnowEmitter';

export default function GlobalBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {resolvedTheme === 'dark' ? (
        <ParticleEmitter 
          count={60} 
          speed={0.12} 
          maxSize={2} 
          lineDistance={140} 
          colors={['rgba(99,102,241,0.15)', 'rgba(129,140,248,0.1)']} 
        />
      ) : (
        /* Only apply to dark mode as requested, but keeping SnowEmitter logic ready if needed */
        null
      )}
    </div>
  );
}
