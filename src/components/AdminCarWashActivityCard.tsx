'use client';

/* eslint-disable @next/next/no-img-element */

import { motion, AnimatePresence } from 'framer-motion';
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
  Flag,
  Hash,
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { formatDateThai } from '@/lib/date-utils';

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

export interface CarWashUser {
  _id: string;
  lineDisplayName: string;
  lineProfileImage?: string;
  performanceTier?: string;
  name?: string;
  surname?: string;
}

export interface CarWashComment {
  _id: string;
  userId: CarWashUser;
  text: string;
  createdAt: string;
}

export interface CarWashActivity {
  _id: string;
  userId: CarWashUser;
  activityType: string;
  imageUrls: string[];
  caption: string;
  activityDate: string;
  activityTime: string;
  likes: CarWashUser[];
  comments: CarWashComment[];
  marked: boolean;
  markedBy?: CarWashUser;
  markedAt?: string;
  createdAt: string;
}

function getDisplayName(user: CarWashUser | undefined) {
  if (!user) return 'Unknown';
  if (user.name && user.surname) return `${user.name} ${user.surname}`;
  return user.lineDisplayName || 'Unknown';
}

function Avatar({ user, size = 'md', onClick }: { user?: CarWashUser; size?: 'sm' | 'md' | 'lg'; onClick?: () => void }) {
  const avatarSize = size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm';
  return <UserAvatar imageUrl={user?.lineProfileImage} displayName={user?.name || user?.lineDisplayName} tier={user?.performanceTier} size={avatarSize} onClick={onClick} />;
}

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
        {images.map((src, index) => (
          <button key={index} onClick={() => onClickImage(index)} className="aspect-square overflow-hidden">
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

  return (
    <div className="grid grid-cols-2 gap-0.5">
      {images.slice(0, maxShow).map((src, index) => (
        <button key={index} onClick={() => onClickImage(index)} className="relative aspect-square overflow-hidden">
          <img src={src} alt="" className="w-full h-full object-cover" style={{ background: 'var(--bg-inset)' }} />
          {index === maxShow - 1 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="text-white text-2xl font-bold">+{extra}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

interface AdminCarWashActivityCardProps {
  activity: CarWashActivity;
  index: number;
  isLiked: boolean;
  isCommentOpen: boolean;
  isMenuOpen: boolean;
  commentText: string;
  sendingComment: boolean;
  currentUser: { id: string; name?: string };
  commentInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenProfile: (user?: CarWashUser) => void;
  onToggleMenu: (activityId: string) => void;
  onMark: (activityId: string) => void;
  onOpenEdit: (activity: CarWashActivity) => void;
  onDelete: (activityId: string) => void;
  onOpenGallery: (images: string[], startIndex: number) => void;
  onOpenLikes: (likes: CarWashActivity['likes']) => void;
  onLike: (activityId: string) => void;
  onToggleComments: (activityId: string) => void;
  onDeleteComment: (activityId: string, commentId: string) => void;
  onCommentTextChange: (value: string) => void;
  onCommentSubmit: (activityId: string) => void;
}

export default function AdminCarWashActivityCard({
  activity,
  index,
  isLiked,
  isCommentOpen,
  isMenuOpen,
  commentText,
  sendingComment,
  currentUser,
  commentInputRef,
  onOpenProfile,
  onToggleMenu,
  onMark,
  onOpenEdit,
  onDelete,
  onOpenGallery,
  onOpenLikes,
  onLike,
  onToggleComments,
  onDeleteComment,
  onCommentTextChange,
  onCommentSubmit,
}: AdminCarWashActivityCardProps) {
  const images = (activity.imageUrls || []).map(getImageUrl);

  return (
    <motion.div
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.04 }}
      className="card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar user={activity.userId} onClick={() => onOpenProfile(activity.userId)} />
        <div className="flex-1 min-w-0">
          <p className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {getDisplayName(activity.userId)}
          </p>
          <p className="text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>
            {formatDateThai(activity.activityDate)} | {activity.activityTime} น.
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            โพสต์เมื่อ {dayjs(activity.createdAt).fromNow()}
          </p>
        </div>

        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          <Hash className="w-2.5 h-2.5" />
          {activityTypeLabels[activity.activityType] || activity.activityType}
        </span>

        {activity.marked && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <Flag className="w-3 h-3" />
            Approved
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => onToggleMenu(activity._id)}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ color: 'var(--text-muted)' }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-9 z-20 card p-1 min-w-[160px] shadow-lg"
              >
                <button
                  onClick={() => { onMark(activity._id); onToggleMenu(activity._id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-fluid-xs text-left transition-colors hover:opacity-80"
                  style={{ color: activity.marked ? 'var(--warning)' : 'var(--success)' }}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {activity.marked ? 'ยกเลิก Approve' : 'Approve (Flag)'}
                </button>
                <button
                  onClick={() => onOpenEdit(activity)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-fluid-xs text-left transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
                <button
                  onClick={() => onDelete(activity._id)}
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

      {activity.caption && (
        <div className="px-4 pb-2">
          <p className="text-fluid-sm" style={{ color: 'var(--text-primary)' }}>{activity.caption}</p>
        </div>
      )}

      <ImageGrid images={images} onClickImage={(imageIndex) => onOpenGallery(images, imageIndex)} />

      {(activity.likes.length > 0 || activity.comments.length > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-fluid-xs" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
          <span>
            {activity.likes.length > 0 && (
              <button
                onClick={() => onOpenLikes(activity.likes)}
                className="flex items-center gap-1 hover:underline"
              >
                <Heart className="w-3 h-3 fill-current" style={{ color: 'var(--danger)' }} />
                {activity.likes.length}
              </button>
            )}
          </span>
          <span>{activity.comments.length > 0 && `${activity.comments.length} ความคิดเห็น`}</span>
        </div>
      )}

      <div className="flex items-center px-2 py-1" style={{ borderBottom: isCommentOpen ? '1px solid var(--border)' : 'none' }}>
        <button
          onClick={() => onLike(activity._id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
          style={{ color: isLiked ? 'var(--danger)' : 'var(--text-muted)' }}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          ถูกใจ
        </button>
        <button
          onClick={() => onToggleComments(activity._id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
          style={{ color: isCommentOpen ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          <MessageCircle className="w-4 h-4" />
          แสดงความคิดเห็น
        </button>
        <button
          onClick={() => onMark(activity._id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--radius-md)] text-fluid-xs font-medium transition-colors"
          style={{ color: activity.marked ? 'var(--success)' : 'var(--text-muted)' }}
        >
          <Flag className={`w-4 h-4 ${activity.marked ? 'fill-current' : ''}`} />
          {activity.marked ? 'Approved' : 'Approve'}
        </button>
      </div>

      <AnimatePresence>
        {isCommentOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {activity.comments.length > 0 && (
              <div className="px-4 py-2 space-y-2" style={{ background: 'var(--bg-inset)' }}>
                {activity.comments.map((comment) => (
                  <div key={comment._id} className="flex gap-2 group">
                    <Avatar user={comment.userId} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="inline-block rounded-[var(--radius-md)] px-3 py-1.5" style={{ background: 'var(--bg-surface)' }}>
                        <p className="text-fluid-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {getDisplayName(comment.userId)}
                        </p>
                        <p className="text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 px-1">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {dayjs(comment.createdAt).fromNow()}
                        </span>
                        <button
                          onClick={() => onDeleteComment(activity._id, comment._id)}
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

            <div className="flex items-center gap-2 px-4 py-3">
              <Avatar user={{ _id: currentUser.id, lineDisplayName: currentUser.name || 'Admin', name: currentUser.name }} size="sm" />
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(event) => onCommentTextChange(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onCommentSubmit(activity._id); }}
                  placeholder="เขียนความคิดเห็น..."
                  className="input flex-1 py-2 text-fluid-xs"
                />
                <button
                  onClick={() => onCommentSubmit(activity._id)}
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
}
