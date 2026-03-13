'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, PhoneCall, Hash, User, Circle, MapPin, Flag } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { formatRelativeTime, isUserOnline as checkOnline } from '@/lib/date-utils';

export interface ProfileUser {
  _id: string;
  lineDisplayName: string;
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
                <UserAvatar
                  imageUrl={displayUser.lineProfileImage}
                  displayName={displayUser.lineDisplayName}
                  tier={displayUser.performanceTier}
                  size="xl"
                />
                {/* Online indicator */}
                {displayUser.lastSeen !== undefined && (
                  <div
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      background: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
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
                        style={{ background: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}
                      />
                      <span className="text-fluid-xs font-medium" style={{ color: checkOnline(displayUser.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}>
                        {checkOnline(displayUser.lastSeen) ? 'ออนไลน์' : displayUser.lastSeen ? formatRelativeTime(displayUser.lastSeen) : 'ไม่ทราบ'}
                      </span>
                    </div>
                    {/* Branch + Approved badges */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {displayUser.branch && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          <MapPin className="w-3 h-3" />
                          {displayUser.branch}
                        </span>
                      )}
                      {(displayUser.approvedCount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                          <Flag className="w-3 h-3" />
                          {displayUser.approvedCount} Approved
                        </span>
                      )}
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

                    {/* Branch */}
                    {displayUser.branch && (
                      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                          <MapPin className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>สาขา</p>
                          <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {displayUser.branch}
                          </p>
                        </div>
                      </div>
                    )}

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
