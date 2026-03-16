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
        
        {/* Top Header: Stats & Quick Actions */}
        <header className="h-16 px-6 border-b border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none uppercase">Attendance</h1>
              <p className="text-[10px] font-bold opacity-30 mt-1 uppercase tracking-widest">{ctrl.user?.branch || 'HQ'} · {dateStr}</p>
            </div>
            <div className="w-px h-6 bg-[var(--border)] mx-2" />
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none">Status</span>
                <span className={`text-[11px] font-black uppercase ${ctrl.isClockedIn ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {ctrl.isClockedIn ? 'Working' : 'Off Duty'}
                </span>
              </div>
              {getWorkingTime() && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 leading-none">Duration</span>
                  <span className="text-[11px] font-black">{getWorkingTime()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOffsiteOpen(true)}
              className="h-9 px-4 rounded-xl bg-violet-600 text-white flex items-center gap-2 hover:bg-violet-700 transition-all active:scale-95 shadow-lg shadow-violet-600/20"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Off-site</span>
            </button>
          </div>
        </header>

        {/* Content Body: Map + Controls (Full Screen) */}
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

          {/* Floating Control Panel */}
          <div className="absolute bottom-6 left-6 right-6 lg:right-auto lg:w-[400px] z-[500] space-y-4">
            <ClockCard 
              timeStr={timeStr}
              dateStr={dateStr}
              displayDistance={ctrl.displayDistance}
              isInRange={ctrl.isInRange}
              isClockedIn={ctrl.isClockedIn}
              isClockedOut={ctrl.isClockedOut}
              lastRecordType={ctrl.lastRecordType}
              actionLoading={ctrl.actionLoading}
              locLoading={ctrl.locLoading}
              onClockAction={ctrl.handleClockAction}
              onRefreshLocation={ctrl.updateLocation}
              onRequestCorrection={(type) => { setCorrectionType(type); setIsCorrectionOpen(true); }}
              compact={true}
            />
          </div>

          {/* Map Controls */}
          <div className="absolute top-6 left-6 flex items-center gap-2 z-[500]">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-white shadow-2xl">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-50">Precision</p>
              <p className="text-xs font-black leading-none mt-0.5">{ctrl.distance !== null ? `${Math.round(ctrl.distance)}m` : '---'}</p>
            </div>
            <button onClick={() => warpTo('user')} className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg flex items-center justify-center text-[var(--accent)] border border-white/20 active:scale-90 transition-all">
              <LocateFixed className="w-5 h-5" />
            </button>
            <button onClick={() => warpTo('office')} className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg flex items-center justify-center text-amber-500 border border-white/20 active:scale-90 transition-all">
              <Building2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="lg:hidden">
          <BottomNav role="leader" />
        </div>
      </main>

      {/* History Sidebar */}
      <aside className="hidden lg:flex w-[380px] border-l border-[var(--border)] bg-[var(--bg-surface)] flex-col shrink-0 h-screen">
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
