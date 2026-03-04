'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/th';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  Pencil,
  X,
  Car,
  Flag,
  Plus,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

dayjs.extend(relativeTime);
dayjs.locale('th');

const activityTypeLabels: Record<string, string> = {
  'car-wash': 'ล้างรถ',
  'maintenance': 'ซ่อมบำรุง',
  'inspection': 'ตรวจสภาพ',
  'refuel': 'เติมน้ำมัน',
};

const filterOptions = [
  { key: '', label: 'ทั้งหมด' },
  { key: 'car-wash', label: 'ล้างรถ' },
  { key: 'maintenance', label: 'ซ่อมบำรุง' },
  { key: 'inspection', label: 'ตรวจสภาพ' },
  { key: 'refuel', label: 'เติมน้ำมัน' },
];

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
  imageUrls: string[];
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

// Multi-image grid layout: 1 img = full, 2 = side-by-side, 3 = 1 big + 2 small, 4 = 2x2, 5+ = 2x2 + overlay
function ImageGrid({ images, onClickImage }: { images: string[]; onClickImage: (index: number) => void }) {
  if (!images || images.length === 0) return null;
  const maxShow = 4;
  const extra = images.length - maxShow;

  if (images.length === 1) {
    return (
      <button onClick={() => onClickImage(0)} className="w-full">
        <img src={images[0]} alt="" className="w-full object-cover" style={{ maxHeight: '400px', background: 'var(--bg-inset)' }} />
      </button>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {images.map((src, i) => (
          <button key={i} onClick={() => onClickImage(i)} className="aspect-square overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
          </button>
        ))}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5" style={{ height: '300px' }}>
        <button onClick={() => onClickImage(0)} className="row-span-2 overflow-hidden">
          <img src={images[0]} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
        </button>
        <button onClick={() => onClickImage(1)} className="overflow-hidden">
          <img src={images[1]} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
        </button>
        <button onClick={() => onClickImage(2)} className="overflow-hidden">
          <img src={images[2]} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
        </button>
      </div>
    );
  }

  // 4+ images: 2x2 grid, last cell shows +N overlay if > 4
  return (
    <div className="grid grid-cols-2 gap-0.5">
      {images.slice(0, maxShow).map((src, i) => (
        <button key={i} onClick={() => onClickImage(i)} className="relative aspect-square overflow-hidden">
          <img src={src} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
          {i === maxShow - 1 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="text-white text-2xl font-bold">+{extra}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function CarWashFeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; lineDisplayName: string; lineProfileImage?: string; name?: string; surname?: string } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

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

  // Gallery preview
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('driverUser');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Fetch feed with filter
  useEffect(() => {
    if (!user) return;
    fetchFeed();
  }, [user, filterType]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params = filterType ? `?activityType=${filterType}` : '';
      const res = await fetch(`/api/car-wash${params}`);
      const data = await res.json();
      if (data.success) setActivities(data.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Pusher realtime
  useEffect(() => {
    if (!user) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    });

    const channel = pusher.subscribe('car-wash-feed');

    channel.bind('new-activity', (data: { activity: Activity }) => {
      if (!filterType || data.activity.activityType === filterType) {
        setActivities((prev) => {
          if (prev.some((a) => a._id === data.activity._id)) return prev;
          return [data.activity, ...prev];
        });
      }
    });

    channel.bind('update-activity', (data: { activityId: string; activity: Activity }) => {
      setActivities((prev) => prev.map((a) => (a._id === data.activityId ? data.activity : a)));
    });

    channel.bind('delete-activity', (data: { activityId: string }) => {
      setActivities((prev) => prev.filter((a) => a._id !== data.activityId));
    });

    return () => {
      pusher.unsubscribe('car-wash-feed');
      pusher.disconnect();
    };
  }, [user, filterType]);

  const updateActivity = (updated: Activity) => {
    setActivities((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  };

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

  const handleDelete = async (activityId: string) => {
    if (!user || !confirm('ต้องการลบกิจกรรมนี้?')) return;
    try {
      const res = await fetch(`/api/car-wash/${activityId}?visitorId=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActivities((prev) => prev.filter((a) => a._id !== activityId));
      }
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

  const openGallery = (images: string[], startIndex: number) => {
    setGalleryImages(images);
    setGalleryIndex(startIndex);
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
      <Sidebar role="driver" />

      <div className="lg:pl-[240px] pb-20 lg:pb-6">
        <PageHeader
          title="Moments"
          backHref="/home"
        />

        {/* Filter tabs */}
        <div className="px-4 lg:px-8 pt-2 pb-1">
          <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterType(opt.key)}
                className="shrink-0 px-3.5 py-1.5 rounded-full text-fluid-xs font-medium transition-colors"
                style={{
                  background: filterType === opt.key ? 'var(--accent)' : 'var(--bg-surface)',
                  color: filterType === opt.key ? '#fff' : 'var(--text-secondary)',
                  border: filterType === opt.key ? 'none' : '1px solid var(--border)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto">

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
              </div>
            ) : activities.length === 0 ? (
              <div className="card p-12 text-center">
                <Car className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-fluid-sm font-medium" style={{ color: 'var(--text-muted)' }}>ยังไม่มีกิจกรรม</p>
                <button onClick={() => router.push('/car-wash')} className="btn btn-primary mt-4 text-fluid-xs">
                  โพสต์กิจกรรมแรก
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const isOwner = activity.userId?._id === user.id;
                  const liked = isLiked(activity);
                  const images = activity.imageUrls || [];

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

                        {/* Menu for own posts */}
                        {isOwner && (
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
                                  className="absolute right-0 top-9 z-20 card p-1 min-w-[140px] shadow-lg"
                                >
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
                        )}
                      </div>

                      {/* Caption */}
                      {activity.caption && (
                        <div className="px-4 pb-2">
                          <p className="text-fluid-sm" style={{ color: 'var(--text-primary)' }}>{activity.caption}</p>
                        </div>
                      )}

                      {/* Multi-image grid */}
                      <ImageGrid images={images} onClickImage={(i) => openGallery(images, i)} />

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
                          <span>
                            {activity.comments.length > 0 && `${activity.comments.length} ความคิดเห็น`}
                          </span>
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
                            {/* Existing comments */}
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
                                        {(c.userId?._id === user.id) && (
                                          <button
                                            onClick={() => handleDeleteComment(activity._id, c._id)}
                                            className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ color: 'var(--danger)' }}
                                          >
                                            ลบ
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment input */}
                            <div className="flex items-center gap-2 px-4 py-3">
                              <Avatar user={{ _id: user.id, lineDisplayName: user.lineDisplayName, lineProfileImage: user.lineProfileImage, name: user.name, surname: user.surname }} size="sm" />
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

      {/* Gallery preview modal */}
      <AnimatePresence>
        {galleryImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.95)' }}
            onClick={() => setGalleryImages([])}
          >
            {/* Close */}
            <button
              onClick={() => setGalleryImages([])}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-0 right-0 text-center text-white text-fluid-xs font-medium">
              {galleryIndex + 1} / {galleryImages.length}
            </div>

            {/* Image */}
            <img
              src={galleryImages[galleryIndex]}
              alt=""
              className="max-w-[90vw] max-h-[80vh] rounded-[var(--radius-lg)] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Prev */}
            {galleryIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setGalleryIndex((p) => p - 1); }}
                className="absolute left-3 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next */}
            {galleryIndex < galleryImages.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setGalleryIndex((p) => p + 1); }}
                className="absolute right-3 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-4">
                {galleryImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                    className="w-12 h-12 rounded-[var(--radius-sm)] overflow-hidden shrink-0 transition-all"
                    style={{
                      border: i === galleryIndex ? '2px solid #fff' : '2px solid transparent',
                      opacity: i === galleryIndex ? 1 : 0.5,
                    }}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push('/car-wash')}
        className="fixed z-30 flex items-center justify-center w-14 h-14 rounded-full shadow-lg lg:hidden"
        style={{ background: 'var(--accent)', color: '#fff', bottom: '5.5rem', right: '1.25rem' }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <BottomNav role="driver" />
    </div>
  );
}
