'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import {
  Car,
  CalendarDays,
  Filter,
  Users,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  Pencil,
  X,
  Flag,
  Hash,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

dayjs.extend(isoWeek);
dayjs.extend(relativeTime);
dayjs.locale('th');

const activityTypeLabels: Record<string, string> = {
  'car-wash': 'ล้างรถ',
  'maintenance': 'ซ่อมบำรุง',
  'inspection': 'ตรวจสภาพ',
  'refuel': 'เติมน้ำมัน',
};

function getImageUrl(url: string) {
  if (!url) return '';
  return `/api/car-wash/image?url=${encodeURIComponent(url)}`;
}

interface UserInfo {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
}

interface Comment {
  _id: string;
  userId: UserInfo;
  text: string;
  createdAt: string;
}

interface Activity {
  _id: string;
  userId: UserInfo;
  activityType: string;
  imageUrl: string;
  caption: string;
  activityDate: string;
  activityTime: string;
  likes: string[];
  comments: Comment[];
  marked: boolean;
  markedBy?: UserInfo;
  markedAt?: string;
  createdAt: string;
}

interface DriverOption {
  _id: string;
  lineDisplayName: string;
  name?: string;
  surname?: string;
}

function getDisplayName(u: UserInfo | undefined) {
  if (!u) return 'Unknown';
  if (u.name && u.surname) return `${u.name} ${u.surname}`;
  return u.lineDisplayName || 'Unknown';
}

function Avatar({ user, size = 'md' }: { user?: UserInfo; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-6 h-6 text-[9px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' };
  return (
    <div
      className={`${sizeMap[size]} rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold`}
      style={{ background: 'var(--accent)' }}
    >
      {user?.lineProfileImage ? (
        <img src={user.lineProfileImage} alt="" className="w-full h-full object-cover" />
      ) : (
        (user?.name || user?.lineDisplayName)?.charAt(0) || '?'
      )}
    </div>
  );
}

export default function LeaderCarWashPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDriver, setSelectedDriver] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Comment states
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Action menu
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Edit modal
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [saving, setSaving] = useState(false);

  // Image modal
  const [viewImage, setViewImage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('leaderUser');
    if (!storedUser) {
      router.push('/leader/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Fetch drivers list
  useEffect(() => {
    if (!user) return;
    fetch('/api/users?status=active')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setDrivers(data.users || []);
      })
      .catch(console.error);
  }, [user]);

  // Fetch activities
  useEffect(() => {
    if (!user) return;
    fetchActivities();
  }, [user, selectedDriver, startDate, endDate]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDriver) params.set('userId', selectedDriver);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/car-wash?${params.toString()}`);
      const data = await res.json();
      if (data.success) setActivities(data.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateActivity = (updated: Activity) => {
    setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  };

  // Stats
  const today = dayjs().startOf('day');
  const weekStart = dayjs().startOf('isoWeek');
  const monthStart = dayjs().startOf('month');

  const todayCount = activities.filter((a) => dayjs(a.activityDate).isSame(today, 'day')).length;
  const weekCount = activities.filter((a) => dayjs(a.activityDate).isAfter(weekStart.subtract(1, 'day'))).length;
  const monthCount = activities.filter((a) => dayjs(a.activityDate).isAfter(monthStart.subtract(1, 'day'))).length;
  const markedCount = activities.filter((a) => a.marked).length;

  const clearFilters = () => {
    setSelectedDriver('');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = selectedDriver || startDate || endDate;

  // --- Actions ---
  const handleLike = async (activityId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/car-wash/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', visitorId: user.id }),
      });
      const data = await res.json();
      if (data.success) updateActivity(data.activity);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (activityId: string) => {
    if (!user || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/car-wash/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', visitorId: user.id, text: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        updateActivity(data.activity);
        setCommentText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (activityId: string, commentId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/car-wash/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteComment', commentId, visitorId: user.id }),
      });
      const data = await res.json();
      if (data.success) updateActivity(data.activity);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMark = async (activityId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/car-wash/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark', leaderId: user.id }),
      });
      const data = await res.json();
      if (data.success) updateActivity(data.activity);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (activityId: string) => {
    if (!user || !confirm('ต้องการลบกิจกรรมนี้?')) return;
    try {
      const res = await fetch(`/api/car-wash/${activityId}?visitorId=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setActivities((prev) => prev.filter((a) => a._id !== activityId));
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(null);
  };

  const handleEditSave = async () => {
    if (!user || !editActivity) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/car-wash/${editActivity._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: user.id, caption: editCaption }),
      });
      const data = await res.json();
      if (data.success) {
        updateActivity(data.activity);
        setEditActivity(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (activity: Activity) => {
    setEditCaption(activity.caption);
    setEditActivity(activity);
    setMenuOpen(null);
  };

  const toggleComments = (activityId: string) => {
    if (commentingOn === activityId) {
      setCommentingOn(null);
    } else {
      setCommentingOn(activityId);
      setCommentText('');
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  const isLiked = (activity: Activity) => {
    return user ? activity.likes.some((lid: any) => (lid._id || lid) === user.id) : false;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader
          title="Moments กิจกรรม"
          backHref="/leader/home"
          rightContent={
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary text-fluid-xs flex items-center gap-1.5"
              style={hasFilters ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
            >
              <Filter className="w-3.5 h-3.5" />
              ตัวกรอง
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          }
        />

        <div className="px-4 lg:px-8 py-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">

            {/* Stats */}
            <div className="card p-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--accent)' }}>{todayCount}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>วันนี้</p>
                </div>
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--success)' }}>{weekCount}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>สัปดาห์</p>
                </div>
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--warning)' }}>{monthCount}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>เดือน</p>
                </div>
                <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                  <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--success)' }}>{markedCount}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Approved</p>
                </div>
              </div>
            </div>

            {/* Filters panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="card p-4 space-y-3 overflow-hidden"
                >
                  <div>
                    <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      เลือกพนักงาน
                    </label>
                    <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="input">
                      <option value="">ทั้งหมด</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name && d.surname ? `${d.name} ${d.surname}` : d.lineDisplayName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                        ตั้งแต่
                      </label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="block text-fluid-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                        ถึง
                      </label>
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                    </div>
                  </div>
                  {hasFilters && (
                    <button onClick={clearFilters} className="btn btn-secondary w-full text-fluid-xs">ล้างตัวกรอง</button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Moments Feed */}
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : activities.length === 0 ? (
              <div className="card p-12 text-center">
                <Car className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ไม่มีกิจกรรม</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const liked = isLiked(activity);

                  return (
                    <motion.div
                      key={activity._id}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.04 }}
                      className="card overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 p-4 pb-2">
                        <Avatar user={activity.userId} />
                        <div className="flex-1 min-w-0">
                          <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {getDisplayName(activity.userId)}
                          </p>
                          <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>
                            {dayjs(activity.createdAt).fromNow()} · {activity.activityTime} น.
                          </p>
                        </div>

                        {/* Activity type tag */}
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                          <Hash className="w-2.5 h-2.5" />
                          {activityTypeLabels[activity.activityType] || activity.activityType}
                        </span>

                        {/* Marked badge */}
                        {activity.marked && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                            <Flag className="w-3 h-3" />
                            Approved
                          </div>
                        )}

                        {/* Menu — leader can edit/delete any */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === activity._id ? null : activity._id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {menuOpen === activity._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute right-0 top-9 z-20 card p-1 min-w-[160px] shadow-lg"
                              >
                                <button
                                  onClick={() => { handleMark(activity._id); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-fluid-xs text-left transition-colors hover:opacity-80"
                                  style={{ color: activity.marked ? 'var(--warning)' : 'var(--success)' }}
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                  {activity.marked ? 'ยกเลิก Approve' : 'Approve (Flag)'}
                                </button>
                                <button
                                  onClick={() => openEdit(activity)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-fluid-xs text-left transition-colors hover:opacity-80"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  แก้ไข
                                </button>
                                <button
                                  onClick={() => handleDelete(activity._id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-fluid-xs text-left transition-colors hover:opacity-80"
                                  style={{ color: 'var(--danger)' }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  ลบ
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Caption */}
                      {activity.caption && (
                        <div className="px-4 pb-2">
                          <p className="text-fluid-sm" style={{ color: 'var(--text-primary)' }}>{activity.caption}</p>
                        </div>
                      )}

                      {/* Image */}
                      <button onClick={() => setViewImage(getImageUrl(activity.imageUrl))} className="w-full">
                        <img src={getImageUrl(activity.imageUrl)} alt="" className="w-full object-cover" style={{ maxHeight: '400px', background: 'var(--bg-inset)' }} />
                      </button>

                      {/* Like & Comment counts */}
                      {(activity.likes.length > 0 || activity.comments.length > 0) && (
                        <div className="flex items-center justify-between px-4 py-2 text-fluid-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                          <span>
                            {activity.likes.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-current" style={{ color: 'var(--danger)' }} />
                                {activity.likes.length}
                              </span>
                            )}
                          </span>
                          <span>{activity.comments.length > 0 && `${activity.comments.length} ความคิดเห็น`}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center px-2 py-1" style={{ borderBottom: commentingOn === activity._id ? '1px solid var(--border)' : 'none' }}>
                        <button
                          onClick={() => handleLike(activity._id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
                          style={{ color: liked ? 'var(--danger)' : 'var(--text-muted)' }}
                        >
                          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                          ถูกใจ
                        </button>
                        <button
                          onClick={() => toggleComments(activity._id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
                          style={{ color: commentingOn === activity._id ? 'var(--accent)' : 'var(--text-muted)' }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          แสดงความคิดเห็น
                        </button>
                        <button
                          onClick={() => handleMark(activity._id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
                          style={{ color: activity.marked ? 'var(--success)' : 'var(--text-muted)' }}
                        >
                          <Flag className={`w-4 h-4 ${activity.marked ? 'fill-current' : ''}`} />
                          {activity.marked ? 'Approved' : 'Approve'}
                        </button>
                      </div>

                      {/* Comments section */}
                      <AnimatePresence>
                        {commentingOn === activity._id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {activity.comments.length > 0 && (
                              <div className="px-4 py-2 space-y-2" style={{ background: 'var(--bg-inset)' }}>
                                {activity.comments.map((c) => (
                                  <div key={c._id} className="flex gap-2 group">
                                    <Avatar user={c.userId} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <div className="inline-block rounded-[var(--radius-md)] px-3 py-1.5" style={{ background: 'var(--bg-surface)' }}>
                                        <p className="text-fluid-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                          {getDisplayName(c.userId)}
                                        </p>
                                        <p className="text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>{c.text}</p>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 px-1">
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                          {dayjs(c.createdAt).fromNow()}
                                        </span>
                                        <button
                                          onClick={() => handleDeleteComment(activity._id, c._id)}
                                          className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                          style={{ color: 'var(--danger)' }}
                                        >
                                          ลบ
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment input */}
                            <div className="flex items-center gap-2 px-4 py-3">
                              <Avatar user={{ _id: user.id, lineDisplayName: user.lineDisplayName || 'Leader', name: user.name }} size="sm" />
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  ref={commentInputRef}
                                  type="text"
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleComment(activity._id); }}
                                  placeholder="เขียนความคิดเห็น..."
                                  className="input flex-1 py-2 text-fluid-xs"
                                />
                                <button
                                  onClick={() => handleComment(activity._id)}
                                  disabled={!commentText.trim() || sendingComment}
                                  className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors"
                                  style={{ background: commentText.trim() ? 'var(--accent)' : 'var(--bg-inset)', color: commentText.trim() ? '#fff' : 'var(--text-muted)' }}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setEditActivity(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="card w-full max-w-md p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>แก้ไขรายละเอียด</h3>
                <button onClick={() => setEditActivity(null)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                className="input resize-none w-full mb-4"
                placeholder="รายละเอียด..."
              />
              <div className="flex gap-2">
                <button onClick={() => setEditActivity(null)} className="btn btn-secondary flex-1 text-fluid-sm">ยกเลิก</button>
                <button onClick={handleEditSave} disabled={saving} className="btn btn-primary flex-1 text-fluid-sm">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview modal */}
      <AnimatePresence>
        {viewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            onClick={() => setViewImage(null)}
          >
            <img src={viewImage} alt="" className="max-w-full max-h-[85vh] rounded-[var(--radius-lg)] object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav role="leader" />
    </div>
  );
}
