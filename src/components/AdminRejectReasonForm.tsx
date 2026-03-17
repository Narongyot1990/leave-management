'use client';

interface AdminRejectReasonFormProps {
  rejectReason: string;
  isSubmitting: boolean;
  onRejectReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function AdminRejectReasonForm({
  rejectReason,
  isSubmitting,
  onRejectReasonChange,
  onCancel,
  onConfirm,
}: AdminRejectReasonFormProps) {
  return (
    <>
      <h3 className="text-fluid-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>เหตุผลที่ไม่อนุมัติ</h3>
      <textarea
        value={rejectReason}
        onChange={(event) => onRejectReasonChange(event.target.value)}
        rows={4}
        className="input resize-none"
        placeholder="กรุณาระบุเหตุผล..."
        autoFocus
      />
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="btn btn-secondary flex-1">
          ยกเลิก
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting || !rejectReason.trim()}
          className="btn btn-danger flex-1"
        >
          {isSubmitting ? 'กำลัง...' : 'ยืนยัน'}
        </button>
      </div>
    </>
  );
}
