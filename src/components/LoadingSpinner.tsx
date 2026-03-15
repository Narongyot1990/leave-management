'use client';

interface LoadingSpinnerProps {
  /** Full-screen centered spinner (default) or inline */
  fullScreen?: boolean;
  /** Size of the spinner in px */
  size?: number;
  /** Optional label below the spinner */
  label?: string;
}

export default function LoadingSpinner({ fullScreen = true, size = 40, label }: LoadingSpinnerProps) {
  const spinner = (
    <div className={label ? 'text-center' : ''}>
      <div
        className="rounded-full border-[3px] animate-spin"
        style={{
          width: size,
          height: size,
          borderColor: 'var(--border)',
          borderTopColor: 'var(--accent)',
        }}
      />
      {label && (
        <p className="text-fluid-sm font-medium mt-3" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      {spinner}
    </div>
  );
}
