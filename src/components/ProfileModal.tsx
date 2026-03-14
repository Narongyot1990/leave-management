'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import DriverProfile from '@/components/DriverProfile';

export interface ProfileUser {
  id: string;
  _id?: string;
  lineDisplayName: string;
  linePublicId?: string;
  lineProfileImage?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status?: 'active' | 'pending';
  approvedCount?: number;
  lastSeen?: string;
  isOnline?: boolean;
}

interface ProfileModalProps {
  user: ProfileUser | null;
  open: boolean;
  onClose: () => void;
}

export default function ProfileModal({ user, open, onClose }: ProfileModalProps) {
  const [fullUser, setFullUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !(user?._id || user?.id)) {
      setFullUser(null);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const userId = user.id || user._id;
        const [userRes, countRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/car-wash?userId=${userId}&marked=true&countOnly=true`).catch(() => null),
        ]);
        const userData = await userRes.json();
        let approvedCount = 0;
        if (countRes) {
          const countData = await countRes.json();
          approvedCount = countData.total ?? 0;
        }
        if (userData.success && userData.user) {
          setFullUser({ ...userData.user, id: userData.user._id, approvedCount });
        } else {
          setFullUser({ ...user, id: userId as string, approvedCount });
        }
      } catch {
        setFullUser(user);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [open, user]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !user) return null;

  const displayUser = fullUser || user;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden relative rounded-[24px] shadow-2xl pointer-events-auto"
              style={{ background: 'var(--bg-base)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Outside */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>

              {loading ? (
                <div className="h-[500px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full border-4 animate-spin" 
                      style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} 
                    />
                    <p style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  <DriverProfile user={displayUser} isMe={false} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
