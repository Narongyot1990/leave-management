'use client';

import { CheckCircle2, XCircle, CalendarDays, Phone } from 'lucide-react';
import AdminCardShell from '@/components/AdminCardShell';
import UserAvatar from '@/components/UserAvatar';
import { getLeaveTypeMeta } from '@/lib/leave-types';
import { formatDateThai, getLeaveDays } from '@/lib/date-utils';

export interface AdminApproveRequest {
  _id: string;
  userId: {
    _id: string;
    lineDisplayName: string;
    lineProfileImage?: string;
    performanceTier?: string;
    name?: string;
    surname?: string;
    employeeId?: string;
    phone?: string;
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface AdminApproveRequestCardProps {
  request: AdminApproveRequest;
  index: number;
  actionLoading: string | null;
  onOpenProfile: (requestUser: AdminApproveRequest['userId']) => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function AdminApproveRequestCard({
  request,
  index,
  actionLoading,
  onOpenProfile,
  onApprove,
  onReject,
}: AdminApproveRequestCardProps) {
  const meta = getLeaveTypeMeta(request.leaveType);
  const Icon = meta.icon;

  return (
    <AdminCardShell
      key={request._id}
      initial={{ y: 15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ delay: index * 0.05 }}
      className="overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <UserAvatar
          imageUrl={request.userId?.lineProfileImage}
          displayName={request.userId?.name || request.userId?.lineDisplayName}
          tier={request.userId?.performanceTier}
          size="md"
          onClick={() => onOpenProfile(request.userId)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-fluid-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {request.userId?.name && request.userId?.surname
                ? `${request.userId.name} ${request.userId.surname}`
                : request.userId?.lineDisplayName || 'Unknown'}
              {request.userId?.employeeId && (
                <span className="text-fluid-xs font-normal" style={{ color: 'var(--text-muted)' }}>({request.userId.employeeId})</span>
              )}
            </h3>
            <span className="badge badge-warning shrink-0">รออนุมัติ</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-fluid-xs truncate" style={{ color: 'var(--text-muted)' }}>
              @{request.userId?.lineDisplayName}
            </p>
            {request.userId?.phone && (
              <a href={`tel:${request.userId.phone}`} className="shrink-0">
                <Phone className="w-3.5 h-3.5" style={{ color: '#00C853' }} strokeWidth={2} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="p-4" style={{ background: 'var(--bg-inset)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={1.8} />
          <span className="text-fluid-sm font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-2 text-fluid-xs" style={{ color: 'var(--text-secondary)' }}>
          <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{formatDateThai(request.startDate)} - {formatDateThai(request.endDate)} ({getLeaveDays(request.startDate, request.endDate)} วัน)</span>
        </div>
        <p className="text-fluid-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{request.reason}</p>
      </div>

      <div className="p-3 flex gap-2">
        <button
          onClick={() => onApprove(request._id)}
          disabled={actionLoading === request._id}
          className="btn flex-1 text-fluid-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--success)', color: 'white', boxShadow: '0 4px 12px rgba(5,150,105,0.2)' }}
        >
          {actionLoading === request._id ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              อนุมัติ
            </>
          )}
        </button>
        <button
          onClick={() => onReject(request._id)}
          disabled={actionLoading === request._id}
          className="btn btn-danger flex-1 text-fluid-sm font-semibold disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          ไม่อนุมัติ
        </button>
      </div>
    </AdminCardShell>
  );
}
