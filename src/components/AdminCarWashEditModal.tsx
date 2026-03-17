'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AdminCarWashEditModalProps {
  open: boolean;
  caption: string;
  saving: boolean;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AdminCarWashEditModal({
  open,
  caption,
  saving,
  onCaptionChange,
  onClose,
  onSave,
}: AdminCarWashEditModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="card w-full max-w-md p-3.5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fluid-base font-bold" style={{ color: 'var(--text-primary)' }}>แก้ไขรายละเอียด</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={caption}
              onChange={(event) => onCaptionChange(event.target.value)}
              rows={4}
              className="input resize-none w-full mb-4"
              placeholder="รายละเอียด..."
            />
            <div className="flex gap-2">
              <button onClick={onClose} className="btn btn-secondary flex-1 text-fluid-sm">ยกเลิก</button>
              <button onClick={onSave} disabled={saving} className="btn btn-primary flex-1 text-fluid-sm">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
