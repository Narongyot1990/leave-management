'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, PhoneCall, Hash, User, Circle, MapPin, Flag, MessageCircle } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { formatRelativeTime, isUserOnline as checkOnline } from '@/lib/date-utils';

export interface ProfileUser {
  _id: string;
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
    if (!open || !user?._id) {
      setFullUser(null);
      return;
    }

    const fetchUser = async () => {
      setLoading(true);
      try {
        const [userRes, countRes] = await Promise.all([
          fetch(`/api/users/${user._id}`),
          fetch(`/api/car-wash?userId=${user._id}&marked=true&countOnly=true`).catch(() => null),
        ]);
        const userData = await userRes.json();
        let approvedCount = 0;
        if (countRes) {
          const countData = await countRes.json();
          approvedCount = countData.total ?? 0;
        }
        if (userData.success && userData.user) {
          setFullUser({ ...userData.user, approvedCount });
        } else {
          setFullUser({ ...user, approvedCount });
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="card-neo w-full max-w-[380px] rounded-[28px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-16" style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #6366f1 100%)' }}>
              <button
                onClick={onClose}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-4 -mt-9">
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <UserAvatar
                    imageUrl={displayUser.lineProfileImage}
                    displayName={displayUser.lineDisplayName}
                    tier={displayUser.performanceTier}
                    size="lg"
                  />
                  {displayUser.lastSeen !== undefined && (
                    <div
                      className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                      style={{
                        background: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
                        borderColor: 'var(--bg-surface)',
                      }}
                    >
                      <Circle className="w-1.5 h-1.5 fill-current text-white" />
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="py-5">
                    <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-3">
                      <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {fullName || displayUser.lineDisplayName}
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        @{displayUser.lineDisplayName}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}
                        />
                        <span className="text-[11px] font-medium" style={{ color: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}>
                          {checkOnline(displayUser.lastSeen) ? 'ออนไลน์' : displayUser.lastSeen ? formatRelativeTime(displayUser.lastSeen) : 'ไม่ทราบ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                        {displayUser.branch && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            <MapPin className="w-3 h-3" />
                            {displayUser.branch}
                          </span>
                        )}
                        {(displayUser.approvedCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                            <Flag className="w-3 h-3" />
                            {displayUser.approvedCount} Approved
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full mb-3">
                      <div className="rounded-[var(--radius-lg)] p-3" style={{ background: 'var(--bg-inset)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'var(--bg-surface)' }}>
                          <Hash className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>รหัสพนักงาน</p>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayUser.employeeId || '-'}</p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] p-3" style={{ background: 'var(--bg-inset)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'var(--bg-surface)' }}>
                          <MapPin className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>สาขา</p>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayUser.branch || '-'}</p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] p-3 col-span-2" style={{ background: 'var(--bg-inset)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'var(--bg-surface)' }}>
                          <User className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ชื่อ-นามสกุล</p>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{fullName || '-'}</p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] p-3 col-span-2" style={{ background: 'var(--bg-inset)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: 'var(--bg-surface)' }}>
                          <Phone className="w-4 h-4" style={{ color: 'var(--success)' }} />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>เบอร์โทร</p>
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{displayUser.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full">
                      {displayUser.linePublicId && (
                        <a
                          href={`https://line.me/R/ti/p/~${encodeURIComponent(displayUser.linePublicId)}`}
                          className={`h-11 rounded-[var(--radius-lg)] flex items-center justify-center gap-2 ${displayUser.phone ? '' : 'col-span-2'}`}
                          style={{ background: '#00C300', color: '#fff' }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">LINE</span>
                        </a>
                      )}
                      {displayUser.phone && (
                        <a
                          href={`tel:${displayUser.phone}`}
                          className={`h-11 rounded-[var(--radius-lg)] flex items-center justify-center gap-2 ${displayUser.linePublicId ? '' : 'col-span-2'}`}
                          style={{ background: 'var(--success)' }}
                        >
                          <PhoneCall className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">โทร</span>
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
