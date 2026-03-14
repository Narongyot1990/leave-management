'use client';

import { User } from 'lucide-react';
import { PERFORMANCE_TIER_CONFIG, normalizePerformanceTier, type PerformanceTier } from '@/lib/profile-tier';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<AvatarSize, { outer: string; inner: string; text: string; icon: string; ring: string }> = {
  xs: { outer: 'w-8 h-8', inner: 'w-[26px] h-[26px]', text: 'text-[10px]', icon: 'w-3 h-3', ring: 'p-[2px]' },
  sm: { outer: 'w-10 h-10', inner: 'w-[34px] h-[34px]', text: 'text-xs', icon: 'w-4 h-4', ring: 'p-[2px]' },
  md: { outer: 'w-12 h-12', inner: 'w-[42px] h-[42px]', text: 'text-sm', icon: 'w-5 h-5', ring: 'p-[3px]' },
  lg: { outer: 'w-14 h-14', inner: 'w-[50px] h-[50px]', text: 'text-base', icon: 'w-6 h-6', ring: 'p-[3px]' },
  xl: { outer: 'w-24 h-24', inner: 'w-[86px] h-[86px]', text: 'text-2xl', icon: 'w-10 h-10', ring: 'p-[4px]' },
  '2xl': { outer: 'w-32 h-32', inner: 'w-[116px] h-[116px]', text: 'text-3xl', icon: 'w-14 h-14', ring: 'p-[5px]' },
};

export interface UserAvatarProps {
  imageUrl?: string;
  displayName?: string;
  tier?: PerformanceTier | string;
  size?: AvatarSize;
  onClick?: () => void;
  className?: string;
  showTierBadge?: boolean;
}

export default function UserAvatar({
  imageUrl,
  displayName,
  tier = 'standard',
  size = 'md',
  onClick,
  className = '',
  showTierBadge = false,
}: UserAvatarProps) {
  const normalizedTier = normalizePerformanceTier(tier);
  const tierConfig = PERFORMANCE_TIER_CONFIG[normalizedTier];
  const sizeConfig = sizeMap[size];
  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`relative inline-flex ${className}`.trim()}>
      <div
        className={[
          'relative rounded-full flex items-center justify-center shrink-0',
          sizeConfig.outer,
          sizeConfig.ring,
          tierConfig.ringClassName,
          tierConfig.glowClassName,
          onClick ? 'cursor-pointer transition-transform duration-200 hover:scale-[1.03]' : '',
        ].join(' ')}
        onClick={onClick}
      >
        <div
          className={[
            'rounded-full overflow-hidden flex items-center justify-center text-white font-bold',
            sizeConfig.inner,
            sizeConfig.text,
          ].join(' ')}
          style={{ background: 'var(--accent)' }}
        >
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={displayName || 'User avatar'} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                // Show initial instead
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const initial = document.createElement('span');
                  initial.textContent = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';
                  initial.className = [sizeConfig.inner, sizeConfig.text, 'flex items-center justify-center'].join(' ');
                  initial.style.background = 'var(--accent)';
                  initial.style.color = 'white';
                  initial.style.fontWeight = 'bold';
                  parent.appendChild(initial);
                }
              }}
            />
          ) : (
            displayName ? initial : <User className={sizeConfig.icon} />
          )}
        </div>
      </div>

      {showTierBadge && normalizedTier !== 'standard' && (
        <span
          className={[
            'absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
            tierConfig.badgeClassName,
          ].join(' ')}
        >
          {tierConfig.label}
        </span>
      )}
    </div>
  );
}
