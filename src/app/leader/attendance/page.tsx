'use client';

import { useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const ctrl = useAttendanceController();
  const mapRef = useRef<any>(null);
  
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isOffsiteOpen, setIsOffsiteOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<'in' | 'out'>('in');

  const timeStr = ctrl.currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = ctrl.currentTime.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });

  const getWorkingTime = () => {
    const inRec = ctrl.records.find(r => r.type === 'in');
    const outRec = ctrl.records.find(r => r.type === 'out');
    if (inRec && outRec) {
      const diff = new Date(outRec.timestamp).getTime() - new Date(inRec.timestamp).getTime();
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      return `${hours}h ${mins}m`;
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
    <div className="h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin border-[var(--border)] border-t-[var(--accent)]" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-[var(--bg-base)]">
      <Sidebar role="leader" />
      
      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 lg:pl-[240px] relative">
        
        {/* MVP Header: Simple & Focused */}
        <header className="h-14 px-4 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => router.back()}
               className="p-2 -ml-2 rounded-xl hover:bg-[var(--bg-inset)] transition-all active:scale-90"
             >
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
             <h1 className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Time Attendance</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${ctrl.isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{ctrl.isClockedIn ? 'Active' : 'Off'}</span>
          </div>
        </header>

        {/* Content Body: Map + MVP Controls */}
        <div className="flex-1 relative overflow-hidden bg-[var(--bg-inset)]">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-20">
              <LocateFixed className="w-8 h-8 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Wait GPS</p>
            </div>
          )}

          {/* Floating MVP Control Panel */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:w-[350px] z-[500]">
            <ClockCard 
              timeStr={timeStr}
              displayDistance={ctrl.displayDistance}
              isInRange={ctrl.isInRange}
              lastRecordType={ctrl.lastRecordType}
              actionLoading={ctrl.actionLoading}
              onClockAction={ctrl.handleClockAction}
              onRequestCorrection={(type) => { setCorrectionType(type); setIsCorrectionOpen(true); }}
            />
          </div>

          {/* Map Utils */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-[500]">
            <button onClick={() => warpTo('user')} className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-slate-900 shadow-xl flex items-center justify-center text-[var(--accent)] border border-white/20 active:scale-90 transition-all">
              <LocateFixed className="w-5 h-5" />
            </button>
            <button onClick={() => warpTo('office')} className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-slate-900 shadow-xl flex items-center justify-center text-amber-500 border border-white/20 active:scale-90 transition-all">
              <Building2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="lg:hidden">
          <BottomNav role="leader" />
        </div>
      </main>

      {/* Bird's Eye History Sidebar */}
      <aside className="hidden lg:flex w-[350px] border-l border-[var(--border)] bg-[var(--bg-surface)] flex-col shrink-0 h-screen">
        <HistoryTimeline 
          pairs={ctrl.attendancePairs} 
          onDeleteRecord={ctrl.handleDeleteRecord} 
          onRequestCorrection={(type) => { setCorrectionType(type); setIsCorrectionOpen(true); }}
          isSidebar={true}
        />
      </aside>

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
