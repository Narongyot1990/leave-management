'use client';

import { Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import dayjs from 'dayjs';
import { AlertCircle, CheckCircle2, Send, Calendar, Clock, Wallet, Camera, X, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import DatePickerModal from '@/components/DatePickerModal';
import { INCOME_CLAIM_TYPE_LIST } from '@/lib/ot-types';
import { useOtFormController } from '@/app/ot/_hooks/useOtFormController';

const OT_BACKDATE_LIMIT_DAYS = 7;

function OtContent() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const {
    authUser,
    monthApprovedCount,
    date,
    claimType,
    startTime,
    endTime,
    durationLabel,
    reason,
    loading,
    initializing,
    error,
    success,
    showDatePicker,
    isPending,
    photoPreview,
    setClaimType,
    setStartTime,
    setEndTime,
    setReason,
    setShowDatePicker,
    handleDateSelect,
    handlePhotoSelect,
    removePhoto,
    submit,
  } = useOtFormController(targetUserId);

  if (initializing || !authUser) {
    return null;
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-neo p-8 text-center max-w-sm w-full"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--warning-light)' }}>
            <AlertCircle className="w-7 h-7" style={{ color: 'var(--warning)' }} />
          </div>
          <h2 className="text-fluid-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>รอการยืนยัน</h2>
          <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
            บัญชีของคุณยังไม่เปิดใช้งาน กรุณารอหัวหน้างานอนุมัติ
          </p>
        </motion.div>
      </div>
    );
  }

  const earliestDate = dayjs().subtract(OT_BACKDATE_LIMIT_DAYS, 'day').toDate();
  const latestDate = new Date();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar role={authUser.role || 'driver'} />

      <div className="lg:pl-[240px] pb-[72px] lg:pb-6">
        <PageHeader title="ขอรายได้พิเศษ" backHref={authUser.role === 'driver' ? '/home' : authUser.role === 'leader' ? '/leader/home' : '/admin/home'} />

        <div className="px-4 lg:px-8 py-3">
          <div className="max-w-2xl mx-auto space-y-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-4 text-center">
              <Wallet className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--accent)' }} />
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                เดือนนี้คุณมีรายการรายได้พิเศษสำเร็จแล้ว <span className="font-bold" style={{ color: 'var(--accent)' }}>{monthApprovedCount}</span> รายการ
              </p>
            </motion.div>

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="card p-4 text-center"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--success-light)' }}>
                    <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--success)' }} />
                  </div>
                  <p className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>ส่งคำขอสำเร็จ</p>
                  <p className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>กำลังไปหน้าประวัติ...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] text-fluid-sm"
                style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-3.5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                ประเภทรายได้พิเศษ
              </label>
              <div className="space-y-1.5">
                {INCOME_CLAIM_TYPE_LIST.map((type) => {
                  const Icon = type.icon;
                  const isSelected = claimType === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setClaimType(type.value)}
                      className="w-full min-h-[44px] py-3 px-4 rounded-[var(--radius-md)] text-fluid-sm transition-all flex items-center gap-3"
                      style={{
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-inset)',
                        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                        border: isSelected ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                        fontWeight: isSelected ? 600 : 500,
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: type.color }} strokeWidth={1.8} />
                      <span className="flex-1 text-left">{type.label}</span>
                      {isSelected && <Check className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.03 }} className="card p-3.5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                วันที่ทำ
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full p-4 rounded-[var(--radius-md)] flex items-center gap-3"
                style={{ background: 'var(--bg-inset)' }}
              >
                <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                <span className="text-fluid-base" style={{ color: 'var(--text-primary)' }}>
                  {dayjs(date).format('D MMM YYYY')}
                </span>
              </button>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.04 }} className="card p-3.5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                เวลาเริ่มงาน - จบงาน (ไม่บังคับ)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-fluid-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>เริ่มงาน</span>
                  <div className="flex items-center gap-2 px-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    <input
                      type="time"
                      step={900}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-transparent py-3 text-fluid-base outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-fluid-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>จบงาน</span>
                  <div className="flex items-center gap-2 px-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
                    <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    <input
                      type="time"
                      step={900}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-transparent py-3 text-fluid-base outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
              {durationLabel && (
                <p className="text-fluid-sm font-semibold mt-3" style={{ color: 'var(--accent)' }}>
                  รวมเวลาทำงาน: {durationLabel}
                </p>
              )}
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="card p-3.5">
              <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                รูปใบงาน
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelect(file);
                  if (photoInputRef.current) photoInputRef.current.value = '';
                }}
              />
              {photoPreview ? (
                <div className="relative w-32 aspect-square rounded-[var(--radius-md)] overflow-hidden" style={{ background: 'var(--bg-inset)' }}>
                  <img src={photoPreview} alt="รูปใบงาน" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-[var(--radius-md)] border-2 border-dashed transition-colors"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-inset)' }}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-fluid-xs">ถ่ายรูป / แนบรูปใบงาน</span>
                </button>
              )}
            </motion.div>

            <motion.form
              onSubmit={submit}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="card p-3.5 space-y-4"
            >
              <div>
                <label className="block text-fluid-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  เหตุผล / งานที่ทำ
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="กรุณาระบุเหตุผล/งานที่ทำ..."
                  required
                />
              </div>

              <button type="submit" disabled={loading || !photoPreview} className="btn btn-primary w-full mt-2">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    กำลังส่งคำขอ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    ส่งคำขอ
                  </span>
                )}
              </button>
            </motion.form>
          </div>
        </div>
      </div>

      <DatePickerModal
        open={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={() => {}}
        onConfirmSingle={handleDateSelect}
        initialDate={new Date(date)}
        mode="single"
        allowPast
        fromDate={earliestDate}
        toDate={latestDate}
        title="เลือกวันที่"
      />

      <BottomNav role={authUser.role || 'driver'} />
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

export default function OtPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OtContent />
    </Suspense>
  );
}
