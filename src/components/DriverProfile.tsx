"use client";
import React from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, Calendar, Award, Star, 
  MapPin, Phone, TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const displayName = user.name && user.surname ? `${user.name} ${user.surname}` : user.lineDisplayName || 'Driver';
  
  // Normalize tier and get config
  const tier = normalizePerformanceTier(user.performanceTier);
  const tierConfig = PERFORMANCE_TIER_CONFIG[tier];
  
  const tierColors: Record<PerformanceTier, { bg: string; text: string; border: string }> = {
    standard: { bg: 'var(--bg-inset)', text: 'var(--text-muted)', border: 'var(--border)' },
    bronze: { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' },
    silver: { bg: '#f1f5f9', text: '#64748b', border: '#94a3b8' },
    gold: { bg: '#fef9c3', text: '#a16207', border: '#eab308' },
    platinum: { bg: '#f5f3ff', text: '#7c3aed', border: '#8b5cf6' },
  };
  const colors = tierColors[tier];

  return (
    <div className="flex flex-col p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Header - Avatar + Info */}
      <div className="flex items-center gap-4 mb-4">
        <div 
          className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          style={{ border: `3px solid ${colors.border}`, background: colors.bg }}
        >
          {user.lineProfileImage ? (
            <img 
              src={user.lineProfileImage} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <UserIcon className={`w-8 h-8 ${user.lineProfileImage ? 'hidden' : ''}`} style={{ color: colors.text }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </h1>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {user.employeeId || 'รอกำหนด ID'}
          </p>
          <div className="flex gap-2 mt-2">
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {user.branch || '—'}
            </span>
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ 
                background: user.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)',
                color: user.status === 'active' ? 'var(--success)' : 'var(--warning)'
              }}
            >
              {user.status === 'active' ? 'ใช้งาน' : 'รอ'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row - Compact */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {/* Points */}
        <div className="card p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.performancePoints ?? 0}</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>คะแนน</p>
        </div>
        
        {/* Tier */}
        <div className="card p-3 text-center">
          <Award className="w-4 h-4 mx-auto mb-1" style={{ color: colors.text }} />
          <p className="text-lg font-bold" style={{ color: colors.text }}>{tierConfig.label}</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Tier</p>
        </div>
        
        {/* Level */}
        <div className="card p-3 text-center">
          <Star className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--warning)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.performanceLevel ?? 1}</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Level</p>
        </div>
        
        {/* Leave Days */}
        <div className="card p-3 text-center">
          <Calendar className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--success)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{(user.vacationDays ?? 0) + (user.sickDays ?? 0)}</p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>วันลา</p>
        </div>
      </div>

      {/* Leave Quota - Compact */}
      <div className="card p-3 mb-4">
        <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>วันลาคงเหลือ</h3>
        <div className="space-y-2">
          <QuotaRow label="พักร้อน" current={user.vacationDays ?? 0} total={10} color="var(--accent)" />
          <QuotaRow label="ป่วย" current={user.sickDays ?? 0} total={10} color="var(--danger)" />
          <QuotaRow label="กิจ" current={user.personalDays ?? 0} total={5} color="var(--success)" />
        </div>
      </div>

      {/* Contact Info - Compact */}
      <div className="card p-3">
        <h3 className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>ติดต่อ</h3>
        <div className="flex items-center gap-2 mb-2">
          <Phone className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{user.phone || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{user.branch || '—'}</span>
        </div>
      </div>
    </div>
  );
}

function QuotaRow({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const percent = Math.min(100, (current / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-end">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{current}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-inset)' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
