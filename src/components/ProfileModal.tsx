'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, PhoneCall, Hash, User, Circle } from 'lucide-react';

export interface ProfileUser {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  status?: 'active' | 'pending';
  lastSeen?: string;
  isOnline?: boolean;
}

interface ProfileModalProps {
  user: ProfileUser | null;
  open: boolean;
  onClose: () => void;
}

function formatLastSeen(dateStr?: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'เมื่อสักครู่';
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffWeeks < 4) return `${diffWeeks} สัปดาห์ที่แล้ว`;
  return `${diffMonths} เดือนที่แล้ว`;
}

export default function ProfileModal({ user, open, onClose }: ProfileModalProps) {
  const [fullUser, setFullUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?._id) {
      setFullUser(null);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users/${user._id}`);
        const data = await res.json();
        if (data.success && data.user) {
          setFullUser(data.user);
        } else {
          setFullUser(user);
        }
      } catch {
        setFullUser(user);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [open, user]);

  const displayUser = fullUser || user;
  if (!displayUser) return null;

  const fullName = [displayUser.name, displayUser.surname].filter(Boolean).join(' ');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="card-neo w-full sm:max-w-sm rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cover gradient */}
            <div className="relative h-20" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)' }}>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center -mt-12 px-5 pb-5">
              <div className="relative mb-3">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden border-4 shadow-lg"
                  style={{ background: 'var(--accent)', borderColor: 'var(--bg-surface)' }}
                >
                  {displayUser.lineProfileImage ? (
                    <img
                      src={displayUser.lineProfileImage}
                      alt={displayUser.lineDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                {displayUser.isOnline !== undefined && (
                  <div
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      background: displayUser.isOnline ? 'var(--success)' : 'var(--text-muted)',
                      borderColor: 'var(--bg-surface)',
                    }}
                  >
                    <Circle className="w-2 h-2 fill-current text-white" />
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-4">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                </div>
              ) : (
                <>
                  {/* Name & online status */}
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                      {fullName || displayUser.lineDisplayName}
                    </h2>
                    <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                      @{displayUser.lineDisplayName}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ background: displayUser.isOnline ? 'var(--success)' : 'var(--text-muted)' }}
                      />
                      <span className="text-fluid-xs font-medium" style={{ color: displayUser.isOnline ? 'var(--success)' : 'var(--text-muted)' }}>
                        {displayUser.isOnline ? 'ออนไลน์' : displayUser.lastSeen ? formatLastSeen(displayUser.lastSeen) : 'ไม่ทราบ'}
                      </span>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="w-full rounded-[var(--radius-lg)] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {/* Employee ID */}
                    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                        <Hash className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>รหัสพนักงาน</p>
                        <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {displayUser.employeeId || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Full name */}
                    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                        <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>ชื่อ-นามสกุล</p>
                        <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {fullName || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                        <Phone className="w-4 h-4" style={{ color: 'var(--success)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>เบอร์โทร</p>
                        <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {displayUser.phone || '-'}
                        </p>
                      </div>
                      {displayUser.phone && (
                        <a
                          href={`tel:${displayUser.phone}`}
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'var(--success)' }}
                        >
                          <PhoneCall className="w-4 h-4 text-white" />
                        </a>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
