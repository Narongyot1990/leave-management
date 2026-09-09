'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AdminModalShell from '@/components/AdminModalShell';
import ImageViewerModal from '@/components/ImageViewerModal';
import OtMonthlyView, { type OtMonthlyRecord } from '@/components/OtMonthlyView';

interface OtPersonHistoryModalProps {
  userId: string | null;
  displayName?: string;
  onClose: () => void;
}

export default function OtPersonHistoryModal({ userId, displayName, onClose }: OtPersonHistoryModalProps) {
  const [records, setRecords] = useState<OtMonthlyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const fetchHistory = useCallback(async (targetUserId: string, isCancelled: () => boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ot?userId=${encodeURIComponent(targetUserId)}`);
      const data = await response.json();
      if (!isCancelled() && data.success) {
        setRecords(data.requests);
      }
    } catch {
      // ignore
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    fetchHistory(userId, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [userId, fetchHistory]);

  return (
    <>
      <AnimatePresence>
        {userId && (
          <AdminModalShell
            onClose={onClose}
            contentClassName="card-neo w-full sm:max-w-md rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] max-h-[85vh] overflow-y-auto p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-fluid-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                ประวัติ OT{displayName ? ` - ${displayName}` : ''}
              </h3>
              <button onClick={onClose} className="btn btn-ghost w-7 h-7 p-0 min-h-0 min-w-0">
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <OtMonthlyView records={records} onViewPhoto={setViewingPhotoUrl} loading={loading} />
          </AdminModalShell>
        )}
      </AnimatePresence>

      <ImageViewerModal imageUrl={viewingPhotoUrl} onClose={() => setViewingPhotoUrl(null)} />
    </>
  );
}
