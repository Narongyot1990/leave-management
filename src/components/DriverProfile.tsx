"use client";
import React from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, Calendar, Award, Star, 
  MapPin, Phone, Briefcase, ShieldCheck, Mail,
  TrendingUp, Activity
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileUserData {
  id?: string;
  _id?: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  performanceTier?: string;
  performancePoints?: number;
  performanceLevel?: number;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  status?: string;
  vacationDays?: number;
  sickDays?: number;
  personalDays?: number;
  approvedCount?: number;
  lastSeen?: string;
  isOnline?: boolean;
}

interface DriverProfileProps {
  user: ProfileUserData;
  isMe?: boolean;
  onEditClick?: () => void;
}

export default function DriverProfile({ user, isMe = true, onEditClick }: DriverProfileProps) {
  const router = useRouter();
  const displayName = user.name && user.surname ? `${user.name} ${user.surname}` : user.lineDisplayName || 'Driver';
  
  // Get tier color
  const getTierColor = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return { bg: '#e5e7eb', text: '#6b7280', accent: '#374151' };
      case 'gold': return { bg: '#fef3c7', text: '#b45309', accent: '#d97706' };
      case 'silver': return { bg: '#f3f4f6', text: '#6b7280', accent: '#9ca3af' };
      case 'bronze': return { bg: '#fed7aa', text: '#9a3412', accent: '#ea580c' };
      default: return { bg: 'var(--bg-inset)', text: 'var(--text-muted)', accent: 'var(--accent)' };
    }
  };
  const tierStyle = getTierColor(user.performanceTier);

  return (
    <div className="flex flex-col p-4 md:p-6" style={{ background: 'var(--bg-base)' }}>
      {/* ── Bento Grid Layout ── */}
      <div className="grid grid-cols-12 gap-3">
        
        {/* 1. Identity Card (Main) */}
        <div 
          className="col-span-12 md:col-span-6 row-span-2 rounded-[20px] p-5 flex items-center gap-4"
          style={{ background: 'var(--surface-elevated)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="relative">
            <div 
              className="w-20 h-20 md:w-24 md:h-24 rounded-[20px] overflow-hidden border-4 flex items-center justify-center"
              style={{ borderColor: tierStyle.accent, background: tierStyle.bg }}
            >
              {user.lineProfileImage ? (
                <img src={user.lineProfileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10" style={{ color: tierStyle.text }} />
              )}
            </div>
            {user.isOnline && (
              <div 
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ background: 'var(--success)', borderColor: 'var(--bg-base)' }}
              >
                <Activity className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {displayName}
            </h1>
            <p className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user.employeeId || 'รอกำหนด ID'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span 
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {user.branch || 'General'}
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                style={{ 
                  background: user.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)',
                  color: user.status === 'active' ? 'var(--success)' : 'var(--warning)'
                }}
              >
                {user.status === 'active' ? 'พร้อมใช้งาน' : 'รอยืนยัน'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Performance */}
        <div 
          className="col-span-6 md:col-span-3 row-span-2 rounded-[20px] p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Tier</span>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-black text-white">{user.performancePoints || 0}</p>
            <p className="text-[10px] font-medium text-white/70 uppercase">คะแนน</p>
          </div>
        </div>

        {/* 3. Rating */}
        <div 
          className="col-span-6 md:col-span-3 row-span-2 rounded-[20px] p-4 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
        >
          <div className="flex justify-between items-start">
            <div className="p-2 bg-white/20 rounded-xl">
              <Star size={18} className="text-white" />
            </div>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Level {user.performanceLevel || 1}</span>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-black text-white">4.8</p>
            <p className="text-[10px] font-medium text-white/70 uppercase">คะแนน</p>
          </div>
        </div>

        {/* 4. Leave Quota */}
        <div 
          className="col-span-12 md:col-span-5 row-span-3 rounded-[20px] p-5"
          style={{ background: 'var(--surface-elevated)', boxShadow: 'var(--shadow-sm)' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={14} className="text-accent" /> วันลาคงเหลือ
          </h3>
          <div className="space-y-4">
            <QuotaRow label="วันลาพักร้อน" current={user.vacationDays ?? 0} total={10} color="var(--accent)" />
            <QuotaRow label="วันลาป่วย" current={user.sickDays ?? 0} total={10} color="var(--danger)" />
            <QuotaRow label="วันลากิจ" current={user.personalDays ?? 0} total={5} color="var(--success)" />
          </div>
        </div>

        {/* 5. Contact Info */}
        <div 
          className="col-span-12 md:col-span-4 row-span-3 rounded-[20px] p-5"
          style={{ background: 'var(--bg-inset)' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>ติดต่อ</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>มือถือ</p>
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.phone || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>สาขา</p>
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.branch || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Actions */}
        <div className="col-span-12 md:col-span-3 row-span-3 flex flex-col gap-3">
          {isMe && (
            <button 
              onClick={onEditClick || (() => router.push('/profile-edit'))}
              className="flex-1 card p-4 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <UserIcon size={20} />
              <span className="text-xs font-bold uppercase">แก้ไขโปรไฟล์</span>
            </button>
          )}
          <button 
            className="flex-1 card p-4 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ background: 'var(--bg-inset)', color: 'var(--text-muted)' }}
          >
            <Briefcase size={20} />
            <span className="text-[10px] font-bold uppercase">ดูประวัติ</span>
          </button>
        </div>

        {/* 7. Stats Summary */}
        <div 
          className="col-span-6 md:col-span-4 row-span-2 rounded-[20px] p-4 flex items-center gap-3"
          style={{ background: 'var(--success)', color: 'white' }}
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <Award size={20} />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black">{user.approvedCount || 0}</p>
            <p className="text-[10px] font-medium opacity-80">ภารกิจสำเร็จ</p>
          </div>
        </div>

        <div 
          className="col-span-6 md:col-span-4 row-span-2 rounded-[20px] p-4 flex items-center gap-3"
          style={{ background: 'var(--warning)', color: 'white' }}
        >
          <div className="p-3 bg-white/20 rounded-xl">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black">{user.performanceLevel || 1}</p>
            <p className="text-[10px] font-medium opacity-80">ระดับ</p>
          </div>
        </div>

      </div>
    </div>
  );
}

function QuotaRow({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const percent = Math.min(100, (current / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{current}/{total}</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-inset)' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
