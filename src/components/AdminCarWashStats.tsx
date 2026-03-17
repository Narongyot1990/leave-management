'use client';

interface AdminCarWashStatsProps {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  approvedCount: number;
}

export default function AdminCarWashStats({
  todayCount,
  weekCount,
  monthCount,
  approvedCount,
}: AdminCarWashStatsProps) {
  return (
    <div className="card p-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
          <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--accent)' }}>{todayCount}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>วันนี้</p>
        </div>
        <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
          <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--success)' }}>{weekCount}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>สัปดาห์</p>
        </div>
        <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
          <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--warning)' }}>{monthCount}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>เดือน</p>
        </div>
        <div className="text-center p-2.5 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-inset)' }}>
          <p className="text-fluid-xl font-extrabold" style={{ color: 'var(--success)' }}>{approvedCount}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Approved</p>
        </div>
      </div>
    </div>
  );
}
