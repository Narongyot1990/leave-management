'use client';

import { Filter } from 'lucide-react';

const ACTIVITY_TYPE_OPTIONS = [
  { key: '', label: 'ทั้งหมด' },
  { key: 'car-wash', label: 'ล้างรถ' },
];

interface AdminCarWashFilterToggleButtonProps {
  hasFilters: boolean;
  open: boolean;
  onToggle: () => void;
}

export function AdminCarWashFilterToggleButton({
  hasFilters,
  open,
  onToggle,
}: AdminCarWashFilterToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="btn btn-secondary text-fluid-xs flex items-center gap-1.5"
      style={hasFilters || open ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
    >
      <Filter className="w-3.5 h-3.5" />
      ตัวกรอง
      {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
    </button>
  );
}

interface AdminCarWashActivityTypeTabsProps {
  filterActivityType: string;
  onChangeFilterActivityType: (value: string) => void;
}

export function AdminCarWashActivityTypeTabs({
  filterActivityType,
  onChangeFilterActivityType,
}: AdminCarWashActivityTypeTabsProps) {
  return (
    <div className="px-4 lg:px-8 pt-2 pb-1">
      <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto no-scrollbar">
        {ACTIVITY_TYPE_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => onChangeFilterActivityType(option.key)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-fluid-xs font-medium transition-colors"
            style={{
              background: filterActivityType === option.key ? 'var(--accent)' : 'var(--bg-surface)',
              color: filterActivityType === option.key ? '#fff' : 'var(--text-secondary)',
              border: filterActivityType === option.key ? 'none' : '1px solid var(--border)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
