'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Search, X, Users, MessageCircle, PhoneCall, ChevronRight, MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import ProfileModal, { type ProfileUser } from '@/components/ProfileModal';
import UserAvatar from '@/components/UserAvatar';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatRelativeTime, isUserOnline } from '@/lib/date-utils';
import { usePusher } from '@/hooks/usePusher';
import { useBranches } from '@/hooks/useBranches';

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
  branch?: string;
  status: string;
  role: 'driver' | 'leader' | 'admin';
  lastSeen?: string;
  isOnline?: boolean;
}

export default function ContactsPage() {
  const router = useRouter();
  const { branches } = useBranches();
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'driver' | 'leader'>('all');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          // Driver can only see their branch
          if (data.user.role === 'driver' && data.user.branch) {
            setSelectedBranch(data.user.branch);
          }
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

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    try {
      let url = '/api/users?activeOnly=true';
      // Driver: locked to their branch; Leader/Admin: can filter
      if (user.role === 'driver' && user.branch) {
        url += `&branch=${user.branch}`;
      } else if (selectedBranch !== 'all') {
        url += `&branch=${selectedBranch}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const others = (data.users as Contact[])
          .filter((c) => c._id !== user.id)
          .sort((a, b) => {
            // Sort: branch -> role (leader first) -> online -> name
            if (a.branch !== b.branch) return (a.branch || '').localeCompare(b.branch || '', 'th');
            if (a.role !== b.role) {
              if (a.role === 'leader') return -1;
              if (b.role === 'leader') return 1;
            }
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
  }, [user, selectedBranch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  usePusher('users', [
    { event: 'driver-activated', callback: fetchContacts },
    { event: 'driver-updated', callback: fetchContacts },
    { event: 'driver-deleted', callback: fetchContacts },
  ], !!user);

  const filtered = contacts.filter((c) => {
    if (roleFilter !== 'all' && c.role !== roleFilter) return false;
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
    <div className="min-h-screen pb-[72px] lg:pb-4 lg:pl-[240px]" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="driver" />

      <div className="max-w-3xl mx-auto">
        <PageHeader title="รายชื่อผู้ติดต่อ" subtitle={`${contacts.length} คน · ${onlineCount} ออนไลน์`} />

        <div className="px-4 py-3 space-y-3">
          
          {/* Branch filter (leader/admin only) */}
          {user.role !== 'driver' && (
            <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
              <button
                onClick={() => setSelectedBranch('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
              >
                ทุกสาขา
              </button>
              {branches.map(b => (
                <button
                  key={b.code}
                  onClick={() => setSelectedBranch(b.code)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b.code ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-surface text-muted border border-border'}`}
                >
                  สาขา {b.code}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
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

          {/* Role filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'driver', label: 'พนักงานขับรถ' },
              { id: 'leader', label: 'หัวหน้างาน' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRoleFilter(f.id as any)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all ${
                  roleFilter === f.id
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-muted)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Contact list — same design as leader/drivers */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {search ? 'ไม่พบผู้ติดต่อ' : 'ยังไม่มีผู้ติดต่อ'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((contact, index) => {
                const fullName = [contact.name, contact.surname].filter(Boolean).join(' ');
                return (
                  <motion.div
                    key={contact._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => { setProfileUser(contact as unknown as ProfileUser); setShowProfile(true); }}
                    className="card p-4 flex items-center gap-4 cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        imageUrl={contact.lineProfileImage}
                        displayName={contact.name || contact.lineDisplayName}
                        tier={contact.performanceTier}
                        size="sm"
                      />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{
                          background: isUserOnline(contact.lastSeen) ? 'var(--success)' : 'var(--text-muted)',
                          borderColor: 'var(--bg-surface)',
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${contact.role === 'leader' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          {contact.role || 'Driver'}
                        </span>
                        {contact.branch && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">
                            <MapPin className="w-2.5 h-2.5" />
                            {contact.branch}
                          </span>
                        )}
                      </div>
                      <h3 className="text-fluid-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>
                        {fullName || contact.lineDisplayName}
                      </h3>
                      <p className="text-[10px] font-medium" style={{ color: isUserOnline(contact.lastSeen) ? 'var(--success)' : 'var(--text-muted)' }}>
                        {isUserOnline(contact.lastSeen) ? 'ออนไลน์' : formatRelativeTime(contact.lastSeen)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors">
                      {contact.linePublicId && (
                        <a
                          href={`https://line.me/R/ti/p/~${encodeURIComponent(contact.linePublicId)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-black/20 hover:scale-110 active:scale-95 transition-all"
                          style={{ color: '#00C300' }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-black/20 hover:scale-110 active:scale-95 transition-all text-[var(--success)]"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                      )}
                      <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
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
