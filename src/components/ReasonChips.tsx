'use client';

interface ReasonChipsProps {
  options: string[];
  onSelect: (value: string) => void;
}

export default function ReasonChips({ options, onSelect }: ReasonChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
