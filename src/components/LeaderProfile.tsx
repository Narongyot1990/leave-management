"use client";
import React, { useEffect, useState } from "react";
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
  const themeColor = isAdmin ? 'var(--indigo)' : 'var(--accent)';
  const themeBg = isAdmin ? 'indigo-500/5' : 'accent-light';

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: TrendingUp },
    { id: 'access', label: 'การสิทธิ์', icon: Shield },
    { id: 'contact', label: 'ติดต่อ', icon: Phone }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-3 md:p-6 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -left-40 w-[400px] h-[400px] bg-[var(--accent)] rounded-full blur-[100px] opacity-10`} />
        {isAdmin && <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] opacity-20" />}
      </div>

      <div className="max-w-xl mx-auto relative z-10 pt-2 md:pt-4">
        
        {/* Header Alignment with Driver Style */}
        <div className="flex items-center gap-5 mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative shrink-0"
          >
            <div className="relative w-20 h-20 rounded-[24px] overflow-hidden border-2 border-[var(--border)] p-1 bg-[var(--bg-surface)]">
              {user.lineProfileImage ? (
                <img src={user.lineProfileImage} alt={displayName} className="w-full h-full object-cover rounded-[18px]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-inset)] rounded-[18px]">
                  <UserIcon className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-xl flex items-center gap-1`}>
              <Shield className={`w-3 h-3 ${isAdmin ? 'text-indigo-500' : 'text-[var(--accent)]'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-500' : 'text-[var(--accent)]'}`}>
                {isAdmin ? 'ADMIN' : 'LEADER'}
              </span>
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-2xl font-black tracking-tight mb-1 truncate leading-tight">
                {displayName}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest">
                  {isAdmin ? 'System Root' : `Branch: ${user.branch || '---'}`}
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-500/80 tracking-widest">Active</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs Selection */}
        <div className="flex p-1.5 bg-[var(--bg-inset)] rounded-2xl border border-[var(--border)] mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[var(--accent)]' : 'opacity-40'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Wrap */}
        <div className="space-y-4 pb-12">
          
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              <BentoCard className="col-span-2 p-6 flex items-center gap-5" delay={0.1}>
                 <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-1">Identity Verified</h4>
                    <p className="text-base font-black">LINE Account Linked</p>
                 </div>
                 <div className="ml-auto">
                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black tracking-widest">SECURE</div>
                 </div>
              </BentoCard>

              <BentoCard className="p-6 aspect-square flex flex-col justify-between" delay={0.2}>
                 <div className="flex items-center justify-between">
                    <Building2 className="w-5 h-5 text-amber-500" />
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">Office</span>
                 </div>
                 <div>
                    <p className="text-3xl font-black tracking-tighter text-amber-500">{user.branch || 'ALL'}</p>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Branch Scope</p>
                 </div>
              </BentoCard>

              <BentoCard className="p-6 aspect-square flex flex-col justify-between" delay={0.3}>
                 <div className="flex items-center justify-between">
                    <Command className="w-5 h-5 text-indigo-500" />
                    <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">Access</span>
                 </div>
                 <div>
                    <p className="text-3xl font-black tracking-tighter">{isAdmin ? 'Root' : 'High'}</p>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Security Level</p>
                 </div>
              </BentoCard>

              <BentoCard className="col-span-2 p-5 flex items-center gap-4" delay={0.4} onClick={() => setActiveTab('contact')}>
                <div className="w-10 h-10 rounded-xl bg-sky-500/5 flex items-center justify-center shrink-0 border border-sky-500/10">
                  <Globe className="w-5 h-5 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black truncate">{user.phone || '---'}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Official Contact Number</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-50" />
              </BentoCard>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-4">
              <BentoCard className="p-6" delay={0.1}>
                 <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Management Privileges</h3>
                 </div>
                 <div className="space-y-4">
                    {[
                      { label: 'Attendance Management', enabled: true },
                      { label: 'Leave Approval Control', enabled: true },
                      { label: 'Branch Settings', enabled: isAdmin },
                      { label: 'Driver Activation', enabled: true },
                      { label: 'System Configuration', enabled: isAdmin }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border)]">
                         <span className={`text-xs font-bold ${item.enabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{item.label}</span>
                         {item.enabled ? (
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                         ) : (
                           <ShieldAlert className="w-4 h-4 text-[var(--text-muted)] opacity-30" />
                         )}
                      </div>
                    ))}
                 </div>
              </BentoCard>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <BentoCard className="p-6" delay={0.1}>
                 <div className="flex items-center gap-3 mb-6">
                    <Phone className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Personal Information</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10">
                          <UserIcon className="w-6 h-6 text-emerald-500" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">Full Name</p>
                          <p className="text-lg font-black">{displayName}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10">
                          <Phone className="w-6 h-6 text-emerald-500" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">Phone Number</p>
                          <p className="text-lg font-black">{user.phone || 'ไม่ระบุ'}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-sky-500/5 flex items-center justify-center shrink-0 border border-sky-500/10">
                          <Globe className="w-6 h-6 text-sky-500" />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">LINE Display</p>
                          <p className="text-lg font-black">@{user.lineDisplayName || '---'}</p>
                       </div>
                    </div>
                 </div>
              </BentoCard>
            </div>
          )}
        </div>

        {/* Minimalist Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 text-center pb-8 border-t border-[var(--border)] pt-6">
           {onEditClick && (
             <button 
               onClick={onEditClick}
               className="btn btn-primary w-full h-14 rounded-2xl mb-6 font-black uppercase tracking-[0.2em] text-xs shadow-xl"
             >
                Edit Information
             </button>
           )}
          <p className="text-[8px] font-black text-[var(--text-muted)] opacity-20 uppercase tracking-[0.5em]">
            ITL MANAGEMENT INFRASTRUCTURE • v7.0.1
          </p>
        </motion.div>

      </div>
    </div>
  );
}
