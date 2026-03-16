'use client';

import { useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Briefcase, Building2, LocateFixed } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { useAttendanceController } from './hooks/useAttendanceController';
import { ClockCard } from './components/ClockCard';
import { HistoryTimeline } from './components/HistoryTimeline';
import { StatusBanner } from './components/StatusBanner';
import { CorrectionModal, OffsiteModal } from './components/AttendanceModals';

const BranchMap = dynamic(() => import('@/components/BranchMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-inset animate-pulse rounded-2xl flex items-center justify-center text-xs text-muted">Loading Map...</div>
});

function AttendanceContent() {
  const ctrl = useAttendanceController();
  const mapRef = useRef<any>(null);
  
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isOffsiteOpen, setIsOffsiteOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<'in' | 'out'>('in');

  const timeStr = ctrl.currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = ctrl.currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });

  const getWorkingTime = () => {
    const inRec = ctrl.records.find(r => r.type === 'in');
    const outRec = ctrl.records.find(r => r.type === 'out');
    if (inRec && outRec) {
      const diff = new Date(outRec.timestamp).getTime() - new Date(inRec.timestamp).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours} hr ${mins} min`;
    }
    if (inRec && !outRec) {
      const diff = new Date().getTime() - new Date(inRec.timestamp).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours}h ${mins}m`;
    }
    return null;
  };

  const warpTo = (target: 'user' | 'office') => {
    if (target === 'user' && ctrl.location) mapRef.current?.flyTo(ctrl.location.lat, ctrl.location.lon);
    else if (target === 'office' && ctrl.branchLocation) mapRef.current?.flyTo(ctrl.branchLocation.lat, ctrl.branchLocation.lon);
  };

  if (ctrl.loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role="leader" />
      
      <div className="lg:pl-[240px] pb-[90px] lg:pb-10">
        {/* Header Section */}
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Attendance</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Leader Dashboard · {ctrl.user?.branch || 'HQ'}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsOffsiteOpen(true)}
            className="h-11 px-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-2 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-all active:scale-95"
          >
            <Briefcase className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Off-site Work</span>
          </button>
        </header>

        <div className="px-6 max-w-7xl mx-auto space-y-6">
          <StatusBanner 
            isClockedIn={ctrl.isClockedIn} 
            isClockedOut={ctrl.isClockedOut} 
            workingTime={getWorkingTime()} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Col: Clock Card */}
            <div className="space-y-6">
              <ClockCard 
                timeStr={timeStr}
                dateStr={dateStr}
                distance={ctrl.distance}
                isInRange={ctrl.isInRange}
                isClockedIn={ctrl.isClockedIn}
                isClockedOut={ctrl.isClockedOut}
                actionLoading={ctrl.actionLoading}
                locLoading={ctrl.locLoading}
                onClockAction={ctrl.handleClockAction}
                onRefreshLocation={ctrl.updateLocation}
                onRequestCorrection={(type) => { setCorrectionType(type); setIsCorrectionOpen(true); }}
              />

              {/* Map Card */}
              <div className="relative rounded-[32px] overflow-hidden border border-[var(--border)] shadow-xl bg-[var(--bg-inset)] h-[280px]">
                {ctrl.branchLocation ? (
                  <BranchMap
                    ref={mapRef}
                    center={ctrl.branchLocation}
                    radius={ctrl.branchRadius}
                    userLocation={ctrl.location}
                    userProfileImage={ctrl.user?.lineProfileImage}
                    readOnly={true}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20">
                    <LocateFixed className="w-8 h-8 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Waiting for GPS...</p>
                  </div>
                )}
                
                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-[500]">
                  <button onClick={() => warpTo('user')} className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg flex items-center justify-center text-[var(--accent)] border border-white/20 active:scale-90 transition-all">
                    <LocateFixed className="w-5 h-5" />
                  </button>
                  <button onClick={() => warpTo('office')} className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg flex items-center justify-center text-amber-500 border border-white/20 active:scale-90 transition-all">
                    <Building2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="absolute top-4 left-4 z-[500] bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Precision</p>
                  <p className="text-xs font-black leading-none mt-0.5">{ctrl.distance !== null ? `${Math.round(ctrl.distance)}m` : 'Scanning...'}</p>
                </div>
              </div>
            </div>

            {/* Right Col: History */}
            <div className="space-y-6">
              <HistoryTimeline 
                records={ctrl.records} 
                onDeleteRecord={ctrl.handleDeleteRecord} 
              />
            </div>
          </div>
        </div>
      </div>

      <BottomNav role="leader" />

      {/* Modals */}
      <CorrectionModal 
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        onSubmit={ctrl.submitCorrection}
        loading={ctrl.actionLoading}
        initialType={correctionType}
      />
      <OffsiteModal 
        isOpen={isOffsiteOpen}
        onClose={() => setIsOffsiteOpen(false)}
        onSubmit={ctrl.submitCorrection}
        loading={ctrl.actionLoading}
      />
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[var(--bg-base)]" />}>
      <AttendanceContent />
    </Suspense>
  );
}
