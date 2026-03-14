'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, Phone, PhoneCall, User, X, MessageCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatRelativeTime, isUserOnline } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';

interface Contact {
  _id: string;
  lineUserId: string;
  linePublicId?: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  status: string;
  lastSeen?: string;
  isOnline?: boolean;
}


export default function ContactsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    // Fetch user data from API to get accurate role and branch
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  useOnlineStatus(!!user);

  useEffect(() => {
    if (!user) return;

    const fetchContacts = async () => {
      try {
        // Driver: see drivers in same branch; Leader/Admin: see all
        let url = '/api/users?activeOnly=true';
        if (user.role === 'driver' && user.branch) {
          url += `&branch=${user.branch}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          // Exclude self, sort online first then by name
          const others = (data.users as Contact[])
            .filter((c) => c._id !== user.id)
            .sort((a, b) => {
              if (isUserOnline(a.lastSeen) && !isUserOnline(b.lastSeen)) return -1;
              if (!isUserOnline(a.lastSeen) && isUserOnline(b.lastSeen)) return 1;
              const nameA = a.name || a.lineDisplayName;
              const nameB = b.name || b.lineDisplayName;
              return nameA.localeCompare(nameB, 'th');
            });
          setContacts(others);
        }
      } catch (error) {
        console.error('Fetch contacts error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

  // Pusher realtime — user changes (new driver, activated, etc.)
  const handleUserChanged = useCallback(async () => {
    try {
      let url = '/api/users?activeOnly=true';
      if (user?.role === 'driver' && user?.branch) {
        url += `&branch=${user.branch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const others = (data.users as Contact[])
          .filter((c) => c._id !== user?.id)
          .sort((a, b) => {
            if (isUserOnline(a.lastSeen) && !isUserOnline(b.lastSeen)) return -1;
            if (!isUserOnline(a.lastSeen) && isUserOnline(b.lastSeen)) return 1;
            const nameA = a.name || a.lineDisplayName;
            const nameB = b.name || b.lineDisplayName;
            return nameA.localeCompare(nameB, 'th');
          });
        setContacts(others);
      }
    } catch { /* ignore */ }
  }, [user]);

  usePusher('users', [
    { event: 'driver-activated', callback: handleUserChanged },
    { event: 'driver-updated', callback: handleUserChanged },
    { event: 'driver-deleted', callback: handleUserChanged },
  ], !!user);

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = [c.name, c.surname].filter(Boolean).join(' ').toLowerCase();
    return (
      fullName.includes(q) ||
      c.lineDisplayName.toLowerCase().includes(q) ||
      (c.employeeId && c.employeeId.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const onlineCount = contacts.filter((c) => isUserOnline(c.lastSeen)).length;

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 lg:pb-4 lg:pl-[240px]" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="max-w-2xl mx-auto">
        <PageHeader title="รายชื่อผู้ติดต่อ" subtitle={`${contacts.length} คน · ${onlineCount} ออนไลน์`} />

        <div className="px-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร..."
              className="input w-full pl-10 pr-9 py-2.5 text-fluid-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Contact list */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {search ? 'ไม่พบผู้ติดต่อ' : 'ยังไม่มีผู้ติดต่อ'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((contact, index) => {
                const fullName = [contact.name, contact.surname].filter(Boolean).join(' ');
                return (
                  <motion.div
                    key={contact._id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="card p-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => { setProfileUser(contact as unknown as ProfileUser); setShowProfile(true); }}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <UserAvatar
                        imageUrl={contact.lineProfileImage}
                        displayName={contact.name || contact.lineDisplayName}
                        tier={contact.performanceTier}
                        size="sm"
                      />
                      {/* Online dot */}
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                        style={{
                          background: isUserOnline(contact.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
                          borderColor: 'var(--bg-surface)',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {fullName || contact.lineDisplayName}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[11px] font-medium"
                          style={{ color: isUserOnline(contact.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          {isUserOnline(contact.lastSeen) ? 'ออนไลน์' : contact.lastSeen ? formatRelativeTime(contact.lastSeen) : 'ไม่ทราบ'}
                        </span>
                        {contact.employeeId && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>·</span>
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{contact.employeeId}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* LINE button */}
                      {contact.linePublicId && (
                        <a
                          href={`https://line.me/R/ti/p/~${encodeURIComponent(contact.linePublicId)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                          style={{ background: '#00C300', color: '#fff' }}
                          title="เปิดใน LINE"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {/* Call button */}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                          style={{ background: 'var(--success)', color: '#fff' }}
                          title="โทร"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ProfileModal user={profileUser} open={showProfile} onClose={() => setShowProfile(false)} />
      <BottomNav role="driver" />
    </div>
  );
}
