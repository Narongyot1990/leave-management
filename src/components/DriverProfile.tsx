"use client";
import React from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, Calendar, Award, Star, 
  MapPin, Phone, CheckCircle
} from "lucide-react";
import { normalizePerformanceTier, PERFORMANCE_TIER_CONFIG, PerformanceTier } from "@/lib/profile-tier";

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
  const displayName = user.name && user.surname ? `${user.name} ${user.surname}` : user.lineDisplayName || 'Driver';
  
  const tier = normalizePerformanceTier(user.performanceTier);
  const tierConfig = PERFORMANCE_TIER_CONFIG[tier];
  
  // Premium tier colors
  const tierStyles: Record<PerformanceTier, { bg: string; text: string; border: string; glow: string }> = {
    standard: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', glow: 'none' },
    bronze: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d', glow: '0 0 20px rgba(251, 191, 36, 0.3)' },
    silver: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', glow: '0 0 20px rgba(148, 163, 184, 0.4)' },
    gold: { bg: '#fefce8', text: '#a16207', border: '#facc15', glow: '0 0 25px rgba(250, 204, 21, 0.5)' },
    platinum: { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd', glow: '0 0 30px rgba(167, 139, 250, 0.5)' },
  };
  
  const style = tierStyles[tier];

  return (
    <div 
      className="p-4 rounded-2xl"
      style={{ background: 'var(--bg-surface)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        {/* Avatar with premium ring */}
        <div 
          className="relative"
          style={{ filter: style.glow !== 'none' ? style.glow : 'none' }}
        >
          <div 
            className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ 
              background: style.bg, 
              border: `3px solid ${style.border}` 
            }}
          >
            {user.lineProfileImage ? (
              <img 
                src={user.lineProfileImage} 
                alt="Profile" 
                className="w-full h-full object-cover"
                onError={(e) => { 
                  (e.target as HTMLImageElement).style.display = 'none'; 
                }}
              />
            ) : (
              <span className="text-xl font-bold" style={{ color: style.text }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          {/* Online indicator */}
          {user.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </h1>
          <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
            {user.employeeId || 'รอกำหนด ID'} • {user.branch || '—'}
          </p>
          
          {/* Status & Tier */}
          <div className="flex items-center gap-2 mt-2">
            <span 
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1"
              style={{ 
                background: user.status === 'active' ? '#dcfce7' : '#fef3c7',
                color: user.status === 'active' ? '#16a34a' : '#d97706'
              }}
            >
              <CheckCircle className="w-3 h-3" />
              {user.status === 'active' ? 'ใช้งาน' : 'รออนุมัติ'}
            </span>
            
            <span 
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
            >
              {tierConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Premium Look */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div 
          className="p-3 rounded-xl text-center"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
        >
          <p className="text-xl font-black text-white">{user.performancePoints ?? 0}</p>
          <p className="text-[10px] text-white/80 font-medium">คะแนน</p>
        </div>
        
        <div className="p-3 rounded-xl text-center" style={{ background: style.bg }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-4 h-4" style={{ color: style.text }} />
          </div>
          <p className="text-xl font-black" style={{ color: style.text }}>{user.performanceLevel ?? 1}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Level</p>
        </div>
        
        <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-4 h-4" style={{ color: '#16a34a' }} />
          </div>
          <p className="text-xl font-black" style={{ color: '#16a34a' }}>{(user.vacationDays ?? 0) + (user.sickDays ?? 0)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>วันลา</p>
        </div>
      </div>

      {/* Leave Breakdown */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>วันลาพักร้อน</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.vacationDays ?? 0}/10</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-inset)' }}>
          <div 
            className="h-full rounded-full" 
            style={{ width: `${((user.vacationDays ?? 0) / 10) * 100}%`, background: 'var(--accent)' }} 
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>วันลาป่วย</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.sickDays ?? 0}/10</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-inset)' }}>
          <div 
            className="h-full rounded-full" 
            style={{ width: `${((user.sickDays ?? 0) / 10) * 100}%`, background: 'var(--danger)' }} 
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>วันลากิจ</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.personalDays ?? 0}/5</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-inset)' }}>
          <div 
            className="h-full rounded-full" 
            style={{ width: `${((user.personalDays ?? 0) / 5) * 100}%`, background: 'var(--success)' }} 
          />
        </div>
      </div>

      {/* Contact */}
      <div 
        className="p-3 rounded-xl space-y-2"
        style={{ background: 'var(--bg-inset)' }}
      >
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{user.phone || 'ไม่มีเบอร์'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>สาขา {user.branch || 'ยังไม่กำหนด'}</span>
        </div>
      </div>
    </div>
  );
}
