export const PERFORMANCE_TIERS = ['standard', 'bronze', 'silver', 'gold', 'platinum'] as const;

export type PerformanceTier = (typeof PERFORMANCE_TIERS)[number];

export interface PerformanceTierConfig {
  label: string;
  minPoints: number;
  minLevel: number;
  ringClassName: string;
  glowClassName: string;
  badgeClassName: string;
}

export const PERFORMANCE_TIER_CONFIG: Record<PerformanceTier, PerformanceTierConfig> = {
  standard: {
    label: 'Standard',
    minPoints: 0,
    minLevel: 1,
    ringClassName: 'bg-[linear-gradient(135deg,#cbd5e1,#94a3b8,#e2e8f0)]',
    glowClassName: 'shadow-[0_8px_22px_rgba(148,163,184,0.24)]',
    badgeClassName: 'bg-slate-100 text-slate-700',
  },
  bronze: {
    label: 'Bronze',
    minPoints: 150,
    minLevel: 2,
    ringClassName: 'bg-[linear-gradient(135deg,#b45309,#d97706,#f59e0b,#fbbf24)]',
    glowClassName: 'shadow-[0_10px_28px_rgba(217,119,6,0.28)]',
    badgeClassName: 'bg-amber-100 text-amber-700',
  },
  silver: {
    label: 'Silver',
    minPoints: 400,
    minLevel: 4,
    ringClassName: 'bg-[linear-gradient(135deg,#94a3b8,#e2e8f0,#cbd5e1,#f8fafc)]',
    glowClassName: 'shadow-[0_10px_28px_rgba(148,163,184,0.3)]',
    badgeClassName: 'bg-slate-100 text-slate-600',
  },
  gold: {
    label: 'Gold',
    minPoints: 800,
    minLevel: 6,
    ringClassName: 'bg-[linear-gradient(135deg,#ca8a04,#facc15,#fde047,#f59e0b)]',
    glowClassName: 'shadow-[0_0_24px_rgba(250,204,21,0.5),0_12px_32px_rgba(202,138,4,0.28)]',
    badgeClassName: 'bg-yellow-100 text-yellow-700',
  },
  platinum: {
    label: 'Platinum',
    minPoints: 1400,
    minLevel: 9,
    ringClassName: 'bg-[linear-gradient(135deg,#67e8f9,#a78bfa,#f0abfc,#e2e8f0)]',
    glowClassName: 'shadow-[0_0_28px_rgba(167,139,250,0.42),0_14px_36px_rgba(103,232,249,0.24)]',
    badgeClassName: 'bg-violet-100 text-violet-700',
  },
};

export function getPerformanceTier(points = 0, level = 1): PerformanceTier {
  if (points >= PERFORMANCE_TIER_CONFIG.platinum.minPoints || level >= PERFORMANCE_TIER_CONFIG.platinum.minLevel) {
    return 'platinum';
  }
  if (points >= PERFORMANCE_TIER_CONFIG.gold.minPoints || level >= PERFORMANCE_TIER_CONFIG.gold.minLevel) {
    return 'gold';
  }
  if (points >= PERFORMANCE_TIER_CONFIG.silver.minPoints || level >= PERFORMANCE_TIER_CONFIG.silver.minLevel) {
    return 'silver';
  }
  if (points >= PERFORMANCE_TIER_CONFIG.bronze.minPoints || level >= PERFORMANCE_TIER_CONFIG.bronze.minLevel) {
    return 'bronze';
  }
  return 'standard';
}

export function normalizePerformanceTier(tier?: string | null): PerformanceTier {
  if (!tier) return 'standard';
  return PERFORMANCE_TIERS.includes(tier as PerformanceTier) ? (tier as PerformanceTier) : 'standard';
}
