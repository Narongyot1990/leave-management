'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  const isDark = theme === 'dark';

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)] transition-colors"
      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)' }}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
      ) : (
        <Moon className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
      )}
    </motion.button>
  );
}
