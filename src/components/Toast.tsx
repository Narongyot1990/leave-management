'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Bell } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'notification';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  notification: Bell,
};

const colorMap: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--bg-surface)', border: 'var(--success)', icon: 'var(--success)' },
  error: { bg: 'var(--bg-surface)', border: 'var(--danger)', icon: 'var(--danger)' },
  info: { bg: 'var(--bg-surface)', border: 'var(--accent)', icon: 'var(--accent)' },
  notification: { bg: 'var(--bg-surface)', border: 'var(--warning)', icon: 'var(--warning)' },
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[min(380px,calc(100vw-2rem))]">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const Icon = iconMap[toast.type];
            const colors = colorMap[toast.type];

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="rounded-[var(--radius-md)] p-3 pr-10 relative shadow-lg"
                style={{
                  background: colors.bg,
                  borderLeft: `3px solid ${colors.border}`,
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className="w-[18px] h-[18px] shrink-0 mt-0.5" style={{ color: colors.icon }} />
                  <p className="text-fluid-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => dismiss(toast.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
