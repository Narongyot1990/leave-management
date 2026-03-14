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

const BentoCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg ${className}`}
  >
    {children}
  </motion.div>
);

export default function DriverProfile({ user, isMe = true, onEditClick }: DriverProfileProps) {
  const [mounted, setMounted] = useState(false);
  const [taskScores, setTaskScores] = useState<TaskScores | null>(null);
  const [loadingScores, setLoadingScores] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchScores = async () => {
      const userId = user.id || user._id;
      if (!userId) return;
      setLoadingScores(true);
      try {
        const res = await fetch(`/api/tasks/scores?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setTaskScores(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch task scores", err);
      } finally {
        setLoadingScores(false);
      }
    };
    fetchScores();
  }, [user.id, user._id]);

  if (!mounted) return null;

  const displayName = user.name && user.surname 
    ? `${user.name} ${user.surname}` 
    : user.lineDisplayName || 'Driver';
  
  const tier = normalizePerformanceTier(user.performanceTier);
  const tierConfig = PERFORMANCE_TIER_CONFIG[tier];
  
  const tierTheme = {
    standard: { primary: "slate", gradient: "from-slate-400 to-slate-600" },
    bronze: { primary: "amber", gradient: "from-amber-500 to-amber-700" },
    silver: { primary: "slate", gradient: "from-slate-300 to-slate-500" },
    gold: { primary: "yellow", gradient: "from-yellow-400 to-yellow-600" },
    platinum: { primary: "violet", gradient: "from-violet-400 to-violet-600" },
  }[tier];

  const colorMap: Record<string, string> = {
    slate: 'text-slate-400',
    amber: 'text-amber-500',
    yellow: 'text-yellow-400',
    violet: 'text-violet-400'
  };

  const bgMap: Record<string, string> = {
    slate: 'bg-slate-500/10',
    amber: 'bg-amber-500/10',
    yellow: 'bg-yellow-400/10',
    violet: 'bg-violet-400/10'
  };

  const glowMap: Record<string, string> = {
    slate: 'bg-slate-400/20',
    amber: 'bg-amber-500/20',
    yellow: 'bg-yellow-400/20',
    violet: 'bg-violet-400/20'
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-3 md:p-6 font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-24 -left-24 w-80 h-80 ${glowMap[tierTheme.primary]} rounded-full blur-[100px]`} />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Compact Header Section */}
        <div className="flex items-center gap-4 mb-6 mt-2">
          <motion.div 
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative shrink-0"
          >
            <div className={`absolute inset-0 bg-gradient-to-tr ${tierTheme.gradient} rounded-3xl blur-lg opacity-30`} />
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border border-white/20 p-0.5 bg-[#151518]">
              {user.lineProfileImage ? (
                <img 
                  src={user.lineProfileImage} 
                  alt={displayName} 
                  className="w-full h-full object-cover rounded-[22px]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-[22px]">
                  <UserIcon className="w-10 h-10 text-white/20" />
                </div>
              )}
            </div>
          </motion.div>

          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black bg-white/5 border border-white/5 ${colorMap[tierTheme.primary]} uppercase tracking-widest`}>
                  {tier}
                </span>
                {user.branch && (
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> {user.branch}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter truncate text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                {displayName}
              </h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-0.5">
                Driver ID: {user.employeeId || 'NO-ID'}
              </p>
            </motion.div>
          </div>

          <div className="hidden md:block">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.3 }}
              className={`px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 flex items-center gap-2`}
            >
              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${user.status === 'active' ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
                {user.status === 'active' ? 'Approved' : 'Pending'}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Compact Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          
          {/* Main Stats Card */}
          <BentoCard className="col-span-2 p-5 flex flex-col justify-between min-h-[160px]" delay={0.2}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tierTheme.gradient} opacity-10 blur-2xl -mr-16 -mt-16`} />
            
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${tierTheme.gradient} shadow-md`}>
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight leading-none mb-0.5">{tierConfig.label}</h3>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Performance Tier</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Efficiency Points</span>
                  <span className="text-base font-black">{user.performancePoints || 0} <span className="text-[10px] font-medium text-white/20">/ 2500</span></span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((user.performancePoints || 0) / 2500) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: "circOut", delay: 0.5 }}
                    className={`h-full bg-gradient-to-r ${tierTheme.gradient}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black text-white/50 tracking-tight">Top 15% in Branch</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20" />
            </div>
          </BentoCard>

          {/* Real Quiz Scores Card */}
          <BentoCard className="p-4 flex flex-col justify-between" delay={0.3}>
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-[9px] font-black text-white/20 uppercase">Testing</span>
            </div>
            {loadingScores ? (
              <div className="h-12 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
            ) : taskScores ? (
              <div>
                <h4 className="text-2xl font-black leading-none mb-1" style={{ color: taskScores.levelColor }}>
                  {taskScores.overallPercentage}%
                </h4>
                <p className="text-[10px] font-bold text-white/60 uppercase">{taskScores.knowledgeLevelTh}</p>
              </div>
            ) : (
              <div className="text-[10px] text-white/40 font-bold uppercase italic">No data</div>
            )}
            <div className="text-[9px] text-white/30 font-bold border-t border-white/5 pt-2 mt-2">
              Quiz Results
            </div>
          </BentoCard>

          {/* Level Card */}
          <BentoCard className="p-4 flex flex-col justify-between" delay={0.4}>
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-[9px] font-black text-white/20 uppercase">Ranking</span>
            </div>
            <div>
              <h4 className="text-2xl font-black leading-none mb-1">Level {user.performanceLevel || 1}</h4>
              <p className="text-[10px] font-bold text-white/60 uppercase">Seniority</p>
            </div>
            <div className="text-[9px] text-white/30 font-bold border-t border-white/5 pt-2 mt-2">
              System Rank
            </div>
          </BentoCard>

          {/* Leave Quotas */}
          <BentoCard className="col-span-2 p-4" delay={0.5}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-white/30">Leave Balance</h4>
              <Calendar className="w-3.5 h-3.5 text-white/20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Vacation', val: user.vacationDays, icon: Umbrella, color: 'sky' },
                { label: 'Sick', val: user.sickDays, icon: Thermometer, color: 'rose' },
                { label: 'Personal', val: user.personalDays, icon: Briefcase, color: 'indigo' }
              ].map((q) => (
                <div key={q.label} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
                  <q.icon className={`w-3.5 h-3.5 mx-auto mb-1 text-${q.color}-400`} />
                  <div className="text-sm font-black leading-none">{q.val || 0}</div>
                  <div className="text-[8px] font-bold text-white/40 uppercase mt-0.5">{q.label}</div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Task Impact Card */}
          <BentoCard className="col-span-2 p-4 flex items-center gap-4" delay={0.6}>
            <div className="p-3 rounded-2xl bg-emerald-500/10 shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Tasks Completed</p>
              <h4 className="text-lg font-black">{taskScores?.completedTasks || 0} Modules</h4>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] text-emerald-400 font-bold">Excellent Progress</span>
                <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/10" />
          </BentoCard>

          {/* Contact & Branch Info */}
          <BentoCard className="col-span-2 p-4" delay={0.7}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Phone</p>
                  <p className="text-xs font-black truncate">{user.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">LINE</p>
                  <p className="text-xs font-black truncate text-emerald-400">@{user.lineDisplayName || 'N/A'}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Actions */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={onEditClick}
              className="py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-tight hover:bg-white/90 transition-all flex items-center justify-center gap-2"
            >
              Edit Profile
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-tight hover:bg-white/10 transition-all"
            >
              Support
            </motion.button>
          </div>

        </div>

        {/* Compact Footer */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="mt-8 text-center pb-6"
        >
          <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">
            ITL Logistics Driver Network • V2.5.0
          </p>
        </motion.div>

      </div>
    </div>
  );
}
