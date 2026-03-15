"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  User as UserIcon, Calendar, Award, Star, 
  MapPin, Phone, Shield, Zap, TrendingUp, 
  MessageSquare, ChevronRight, Briefcase, 
  Umbrella, Thermometer, CheckCircle2
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

interface TaskScores {
  totalScore: number;
  totalQuestions: number;
  overallPercentage: number;
  completedTasks: number;
  knowledgeLevel: string;
  knowledgeLevelTh: string;
  levelColor: string;
}

interface DriverProfileProps {
  user: ProfileUserData;
  isMe?: boolean;
  onEditClick?: () => void;
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

const getStatusText = (user: ProfileUserData) => {
  if (!user.lastSeen) return "Offline";
  const lastSeen = new Date(user.lastSeen);
  const now = new Date();
  const diffInMins = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);

  if (diffInMins < 5) return "Online";
  if (diffInMins < 60) return `Active ${diffInMins}m ago`;
  if (diffInMins < 1440) return `Active ${Math.floor(diffInMins / 60)}h ago`;
  return `Active ${Math.floor(diffInMins / 1440)}d ago`;
};

const getStatusColor = (user: ProfileUserData) => {
  if (!user.lastSeen) return "bg-[var(--text-muted)]/20";
  const lastSeen = new Date(user.lastSeen);
  const now = new Date();
  const diffInMins = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
  return diffInMins < 5 ? "bg-emerald-500" : "bg-[var(--text-muted)]/40";
};

export default function DriverProfile({ user, isMe = true, onEditClick }: DriverProfileProps) {
  const [mounted, setMounted] = useState(false);
  const [taskScores, setTaskScores] = useState<TaskScores | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'attendance' | 'contact'>('overview');

  useEffect(() => {
    setMounted(true);
    const userId = user.id || user._id;
    if (!userId) return;

    const fetchData = async () => {
      setLoadingScores(true);
      setLoadingStats(true);
      try {
        const [scoresRes, statsRes] = await Promise.all([
          fetch(`/api/tasks/scores?userId=${userId}`),
          fetch(`/api/profile/stats?userId=${userId}`)
        ]);
        
        const scoresData = await scoresRes.json();
        const statsData = await statsRes.json();

        if (scoresData.success) setTaskScores(scoresData.data);
        if (statsData.success) setActivityStats(statsData.stats);
      } catch (err) {
        console.error("Failed to fetch profile data", err);
      } finally {
        setLoadingScores(false);
        setLoadingStats(false);
      }
    };

    fetchData();
  }, [user.id, user._id]);

  if (!mounted) return null;

  const displayName = user.name && user.surname 
    ? `${user.name} ${user.surname}` 
    : user.lineDisplayName || 'Driver';
  
  const tier = normalizePerformanceTier(user.performanceTier);
  const tierConfig = PERFORMANCE_TIER_CONFIG[tier];
  
  const tierTheme = {
    standard: { primary: "slate", gradient: "from-slate-400 to-slate-600", accent: "#94a3b8" },
    bronze: { primary: "amber", gradient: "from-amber-500 to-amber-700", accent: "#f59e0b" },
    silver: { primary: "slate", gradient: "from-slate-300 to-slate-500", accent: "#cbd5e1" },
    gold: { primary: "yellow", gradient: "from-yellow-400 to-yellow-600", accent: "#fbbf24" },
    platinum: { primary: "violet", gradient: "from-violet-400 to-violet-600", accent: "#a78bfa" },
  }[tier];

  const colorMap: Record<string, string> = {
    slate: 'text-slate-400',
    amber: 'text-amber-500',
    yellow: 'text-yellow-400',
    violet: 'text-violet-400'
  };

  const glowMap: Record<string, string> = {
    slate: 'bg-slate-400/5',
    amber: 'bg-amber-500/5',
    yellow: 'bg-yellow-400/5',
    violet: 'bg-violet-400/5'
  };

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: TrendingUp },
    { id: 'performance', label: 'ผลงาน', icon: Zap },
    { id: 'attendance', label: 'การลา', icon: Calendar },
    { id: 'contact', label: 'ติดต่อ', icon: Phone }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-3 md:p-6 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -left-40 w-[400px] h-[400px] ${glowMap[tierTheme.primary]} rounded-full blur-[100px] opacity-40`} />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] opacity-20" />
      </div>

      <div className="max-w-xl mx-auto relative z-10 pt-2 md:pt-4">
        
        {/* Extreme Compact Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="relative shrink-0"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr ${tierTheme.gradient} rounded-full blur-xl opacity-20`} />
            <div className="relative w-16 h-16 rounded-[22px] overflow-hidden border border-[var(--border)] p-0.5 bg-[var(--bg-surface)]">
              {user.lineProfileImage ? (
                <img src={user.lineProfileImage} alt={displayName} className="w-full h-full object-cover rounded-[20px]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--bg-inset)] rounded-[20px]">
                  <UserIcon className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            {/* Tier Badge overlapping avatar */}
            <motion.div 
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl flex items-center gap-1`}
            >
              <Award className={`w-2.5 h-2.5 ${colorMap[tierTheme.primary]}`} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${colorMap[tierTheme.primary]}`}>{tier}</span>
            </motion.div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className={`w-1 h-1 rounded-full ${getStatusColor(user)}`} />
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">
                  {getStatusText(user)} • {user.branch || '---'}
                </span>
              </div>
              <h1 className="text-xl font-black tracking-tight mb-0.5 truncate leading-tight">
                {displayName}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">ID: {user.employeeId || '---'}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)]" />
                <span className={`text-[9px] font-black uppercase tracking-widest ${user.status === 'active' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                  {user.status === 'active' ? 'Approved' : 'Pending'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons Area - Simple separator */}
        <div className="mb-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--border)] to-transparent"
          />
        </div>

        {/* Tabs Selection - 4 Pillars */}
        <div className="flex p-1 bg-[var(--bg-inset)] rounded-2xl border border-[var(--border)] mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all ${
                activeTab === tab.id 
                  ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[var(--accent)]' : 'opacity-40'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Wrap */}
        <div className="space-y-3 pb-10">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-3">
              <BentoCard className="p-5 flex flex-col justify-between aspect-square" delay={0.1}>
                 <div className="flex items-center justify-between mb-4">
                  <Star className="w-4 h-4 text-emerald-500" />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Growth</span>
                </div>
                <div>
                   <div className="text-3xl font-black tracking-tighter mb-1 text-emerald-500">
                    {taskScores?.overallPercentage || 0}<span className="text-sm opacity-50 ml-1">%</span>
                  </div>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Avg Score</p>
                </div>
              </BentoCard>

              <BentoCard className="p-5 flex flex-col justify-between aspect-square" delay={0.2}>
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-4 h-4 text-violet-500" />
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Rank</span>
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tighter mb-1">
                    Lvl <span className="text-violet-500">{user.performanceLevel || 1}</span>
                  </div>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase">Driver Level</p>
                </div>
              </BentoCard>

              <BentoCard className="col-span-2 p-5 flex items-center justify-between" delay={0.3}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center shrink-0 border border-[var(--border)]">
                    <Calendar className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black leading-tight">โควตาวันลา</h4>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Leave Availability</p>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="text-right">
                    <div className="text-lg font-black leading-none">{user.vacationDays || 0}</div>
                    <div className="text-[7px] font-bold text-[var(--text-muted)] uppercase">Vacation</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black leading-none text-rose-500">{user.sickDays || 0}</div>
                    <div className="text-[7px] font-bold text-[var(--text-muted)] uppercase">Sick</div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="col-span-2 p-5 flex items-center gap-4" delay={0.4} onClick={() => setActiveTab('contact')}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black truncate">{user.phone || '---'}</p>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tap to view contact info</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-50" />
              </BentoCard>
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="grid grid-cols-2 gap-3">
              <BentoCard className="col-span-2 p-5" delay={0.1}>
                 <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Quiz Performance</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/10 text-emerald-500 uppercase tracking-widest">Verified</span>
                </div>
                
                <div className="flex items-end gap-1 mb-6">
                  <div className="text-5xl font-black tracking-tighter text-emerald-500">{taskScores?.overallPercentage || 0}</div>
                  <div className="text-xl font-black text-emerald-500/40 mb-1.5">%</div>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] font-bold text-[var(--text-primary)] uppercase leading-tight">{taskScores?.knowledgeLevelTh || 'กำลังประเมิน...'}</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Knowledge Level</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                       <span className="text-[10px] font-bold">Modules Completed</span>
                    </div>
                    <span className="text-xs font-black">{taskScores?.completedTasks || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Star className="w-3 h-3 text-emerald-500" />
                       <span className="text-[10px] font-bold">Total Questions</span>
                    </div>
                    <span className="text-xs font-black">{taskScores?.totalQuestions || 0}</span>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="col-span-2 p-5" delay={0.2}>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">XP & Progression</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Points</p>
                    <p className="text-xl font-black">{user.performancePoints || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mb-1">Level</p>
                    <p className="text-xl font-black">{user.performanceLevel || 1}</p>
                  </div>
                </div>
              </BentoCard>

              {/* Activity Metrics Section */}
              <BentoCard className="col-span-2 p-5" delay={0.3}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Activity Metrics</h4>
                  </div>
                  <span className="text-[9px] font-black text-amber-500/80 uppercase">Job Duties</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col justify-between aspect-square md:aspect-auto">
                    <div>
                      <CheckCircle2 className="w-4 h-4 text-amber-500 mb-2" />
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">Total Jobs</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-3xl font-black tracking-tighter">{activityStats?.total || 0}</p>
                      <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase">Lifetime Activities</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between aspect-square md:aspect-auto">
                    <div>
                      <Thermometer className="w-4 h-4 text-indigo-500 mb-2" />
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none">Car Wash</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-3xl font-black tracking-tighter">{activityStats?.byType?.['car-wash'] || 0}</p>
                      <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase">Verified Cleanings</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-black text-[var(--text-primary)]">{activityStats?.thisMonth || 0}</p>
                      <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase">This Month</p>
                    </div>
                    <div className="w-[1px] h-4 bg-[var(--border)]" />
                    <div className="text-center">
                      <p className="text-sm font-black text-[var(--text-primary)]">{activityStats?.thisWeek || 0}</p>
                      <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase">This Week</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-[var(--text-muted)] bg-[var(--bg-inset)] px-2 py-1 rounded-md">Realtime Sync</span>
                </div>
              </BentoCard>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="grid grid-cols-2 gap-3">
              <BentoCard className="col-span-2 p-5" delay={0.1}>
                 <div className="flex items-center justify-between mb-5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)]">Remaining Quota</h4>
                  <Calendar className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'พักร้อน', val: user.vacationDays, icon: Umbrella, color: 'text-sky-500', bg: 'bg-sky-500/5' },
                    { label: 'ป่วย', val: user.sickDays, icon: Thermometer, color: 'text-rose-500', bg: 'bg-rose-500/5' },
                    { label: 'กิจ', val: user.personalDays, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/5' }
                  ].map((q) => (
                    <div key={q.label} className={`text-center py-4 rounded-2xl border border-[var(--border)] ${q.bg}`}>
                      <q.icon className={`w-4 h-4 mx-auto mb-2 ${q.color}`} />
                      <div className="text-xl font-black leading-none mb-1">{q.val || 0}</div>
                      <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{q.label}</div>
                    </div>
                  ))}
                </div>
              </BentoCard>

              <BentoCard className="p-5 flex flex-col justify-between" delay={0.2}>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-3xl font-black leading-none mb-1">{user.approvedCount || 0}</div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">Approved</p>
                </div>
              </BentoCard>

              <BentoCard className="p-5 flex flex-col justify-between" delay={0.3}>
                 <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 border border-amber-500/20">
                  <Calendar className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-3xl font-black leading-none mb-1">---</div>
                   <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">Next Leave</p>
                </div>
              </BentoCard>
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 gap-3">
              <BentoCard className="p-5" delay={0.1}>
                 <div className="flex items-center gap-2 mb-6">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Primary Contact</h4>
                </div>
                
                <div className="space-y-6">
                  <a 
                    href={user.phone ? `tel:${user.phone}` : "#"} 
                    className="flex items-center gap-4 group active:scale-[0.98] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/5 flex items-center justify-center shrink-0 border border-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">Mobile Number</p>
                      <p className="text-lg font-black">{user.phone || 'ไม่ระบุ'}</p>
                    </div>
                    <div className="hidden group-hover:block px-2 py-1 rounded-md bg-emerald-500 text-white text-[8px] font-black uppercase">Call Now</div>
                  </a>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/5 flex items-center justify-center shrink-0 border border-sky-500/10">
                      <MessageSquare className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">LINE Display Name</p>
                      <p className="text-lg font-black">@{user.lineDisplayName || '---'}</p>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="p-5" delay={0.2}>
                <div className="flex items-center gap-2 mb-6">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Work Location</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/5 flex items-center justify-center shrink-0 border border-rose-500/10">
                    <MapPin className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1.5">Assigned Branch</p>
                    <p className="text-2xl font-black text-rose-500">{user.branch || 'Pending Assignment'}</p>
                  </div>
                </div>
              </BentoCard>

               <BentoCard className="p-5" delay={0.3}>
                <div className="flex items-center gap-2 mb-6">
                  <UserIcon className="w-4 h-4 text-[var(--text-muted)]" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Core Metadata</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Employee ID</p>
                    <p className="text-sm font-black">{user.employeeId || '---'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Account Status</p>
                    <p className={`text-sm font-black uppercase ${user.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {user.status || 'Unknown'}
                    </p>
                  </div>
                </div>
              </BentoCard>
            </div>
          )}
        </div>

        {/* Minimalist Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 text-center pb-8">
          <p className="text-[8px] font-black text-[var(--text-muted)] opacity-20 uppercase tracking-[0.5em]">
            ITL Logistics Driver Network • V2.8.0
          </p>
        </motion.div>

      </div>
    </div>
  );
}
