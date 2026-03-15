"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, Calendar, Award, 
  MapPin, Phone, Shield, Zap, TrendingUp, 
  ChevronRight, CheckCircle2, ShieldAlert,
  Building2, Globe, Command
} from "lucide-react";

interface ProfileUserData {
  id?: string;
  _id?: string;
  lineDisplayName?: string;
  lineProfileImage?: string;
  name?: string;
  surname?: string;
  phone?: string;
  employeeId?: string;
  branch?: string;
  role?: string;
  status?: string;
}

interface LeaderProfileProps {
  user: ProfileUserData;
  isMe?: boolean;
  onEditClick?: () => void;
  onClose?: () => void;
}

const BentoCard = ({ children, className = "", delay = 0, onClick }: { children: React.ReactNode; className?: string; delay?: number; onClick?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-md shadow-lg ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
  >
    {children}
  </motion.div>
);

export default function LeaderProfile({ user, isMe = false, onEditClick, onClose }: LeaderProfileProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'access' | 'contact'>('overview');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const displayName = user.name && user.surname 
    ? `${user.name} ${user.surname}` 
    : user.lineDisplayName || 'Leader';

  const isAdmin = user.role === 'admin';

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: TrendingUp },
    { id: 'access', label: 'สิทธิ์การใช้งาน', icon: Shield },
    { id: 'contact', label: 'ข้อมูลติดต่อ', icon: Phone }
  ];

  return (
    <div className="bg-[var(--bg-base)] text-[var(--text-primary)] p-2 md:p-4 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <div className="max-w-xl mx-auto relative z-10">
        
        {/* Compact Header */}
        <div className="flex items-center gap-4 mb-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative shrink-0"
          >
            <div className="relative w-16 h-16 rounded-[20px] overflow-hidden border border-[var(--border)] p-0.5 bg-[var(--bg-surface)]">
              {user.lineProfileImage ? (
                <img src={user.lineProfileImage} alt={displayName} className="w-full h-full object-cover rounded-[16px]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-inset)] rounded-[16px]">
                  <UserIcon className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg flex items-center gap-1`}>
              <Shield className={`w-2.5 h-2.5 ${isAdmin ? 'text-indigo-500' : 'text-[var(--accent)]'}`} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-500' : 'text-[var(--accent)]'}`}>
                {isAdmin ? 'ADMIN' : 'LEADER'}
              </span>
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black tracking-tight mb-0.5 truncate leading-tight">
              {displayName || '---'}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">
                {isAdmin ? 'System Root' : `${user.branch || 'PENDING'}`}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase text-emerald-500/80 tracking-widest">
                {user.status === 'active' ? 'Active' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Tabs */}
        <div className="flex p-1 bg-[var(--bg-inset)] rounded-xl border border-[var(--border)] mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' 
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <tab.icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-[var(--accent)]' : 'opacity-40'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-3 pb-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-3">
              <BentoCard className="col-span-2 p-4 flex items-center gap-4" delay={0.1}>
                 <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 </div>
                 <div>
                    <h4 className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Identity</h4>
                    <p className="text-sm font-black">LINE Linked</p>
                 </div>
                 <div className="ml-auto px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black tracking-widest">SECURE</div>
              </BentoCard>

              <BentoCard className="p-4 flex flex-col justify-between h-[100px]" delay={0.2}>
                 <div className="flex items-center justify-between">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Office</span>
                 </div>
                 <div>
                    <p className="text-2xl font-black tracking-tighter text-amber-500 leading-none mb-1">{user.branch || 'ALL'}</p>
                    <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase">Branch</p>
                 </div>
              </BentoCard>

              <BentoCard className="p-4 flex flex-col justify-between h-[100px]" delay={0.3}>
                 <div className="flex items-center justify-between">
                    <Command className="w-4 h-4 text-indigo-500" />
                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Access</span>
                 </div>
                 <div>
                    <p className="text-2xl font-black tracking-tighter leading-none mb-1">{isAdmin ? 'Root' : 'High'}</p>
                    <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase">Level</p>
                 </div>
              </BentoCard>

              <BentoCard className="col-span-2 p-4 flex items-center gap-4" delay={0.4} onClick={() => setActiveTab('contact')}>
                <div className="w-9 h-9 rounded-lg bg-sky-500/5 flex items-center justify-center shrink-0 border border-sky-500/10">
                  <Phone className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate">{user.phone || '---'}</p>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">Official Contact</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-30" />
              </BentoCard>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-2">
              <BentoCard className="p-4" delay={0.1}>
                 <div className="space-y-2">
                    {[
                      { label: 'Attendance', enabled: true },
                      { label: 'Leave Control', enabled: true },
                      { label: 'Branch Access', enabled: isAdmin },
                      { label: 'Drivers', enabled: true },
                      { label: 'System', enabled: isAdmin }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-inset)] border border-[var(--border)]">
                         <span className={`text-[10px] font-bold ${item.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{item.label}</span>
                         {item.enabled ? (
                           <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                         ) : (
                           <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-20" />
                         )}
                      </div>
                    ))}
                 </div>
              </BentoCard>
            </div>
          )}

          {activeTab === 'contact' && (
            <BentoCard className="p-4" delay={0.1}>
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10">
                        <UserIcon className="w-5 h-5 text-emerald-500" />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Full Name</p>
                        <p className="text-sm font-black">{displayName}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10">
                        <Phone className="w-5 h-5 text-emerald-500" />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Phone</p>
                        <p className="text-sm font-black">{user.phone || 'ไม่ระบุ'}</p>
                     </div>
                  </div>
               </div>
            </BentoCard>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4 border-t border-[var(--border)] pt-4 mt-2">
           {onEditClick && (
             <button 
               onClick={onEditClick}
               className="btn btn-primary w-full h-12 rounded-xl mb-4 font-black uppercase tracking-widest text-[10px] shadow-lg"
             >
                Edit Information
             </button>
           )}
          <p className="text-[7px] font-black text-[var(--text-muted)] opacity-30 uppercase tracking-[0.4em]">
            ITL INFRASTRUCTURE • v9.0
          </p>
        </div>
      </div>
    </div>
  );
}
