import React from 'react';

interface ChallanTrackLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'icon' | 'full' | 'compact' | 'text-only' | 'mark-and-text';
  withGlow?: boolean;
  className?: string;
}

/**
 * Clean monochrome glyph mark for contexts that strictly require an icon/avatar.
 * Designed with geometric precision, crisp hairline borders, and zero AI slop.
 */
export const ChallanTrackMark: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = ''
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold select-none border border-slate-700/40 dark:border-slate-300/40 shadow-xs ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) }}
      aria-label="Challan Track"
    >
      <span className="tracking-tight font-mono font-bold leading-none">CT</span>
    </div>
  );
};

/**
 * Pure, high-end typographic brand identity for Challan Track.
 * Sophisticated geometric typography inspired by Stripe and Linear:
 * High contrast, razor-sharp letter-spacing, and zero cheap gradients or colorful vomit.
 */
export default function ChallanTrackLogo({
  size = 'md',
  variant = 'compact',
  className = ''
}: ChallanTrackLogoProps) {
  const pixelTextSize = typeof size === 'number'
    ? size
    : size === 'xs'
    ? 'text-sm'
    : size === 'sm'
    ? 'text-base'
    : size === 'md'
    ? 'text-lg sm:text-xl'
    : size === 'lg'
    ? 'text-2xl sm:text-3xl'
    : 'text-4xl';

  if (variant === 'icon') {
    return <ChallanTrackMark size={typeof size === 'number' ? size : 30} className={className} />;
  }

  return (
    <div className={`inline-flex items-baseline gap-1.5 select-none ${className}`}>
      {/* Pure, elegant typography wordmark */}
      <div className={`flex items-baseline tracking-tight ${pixelTextSize}`}>
        <span className="font-extrabold text-slate-950 dark:text-white tracking-[-0.035em]">
          Challan
        </span>
        <span className="font-light text-slate-400 dark:text-slate-400 tracking-[-0.015em] ml-1">
          Track
        </span>
      </div>
    </div>
  );
}
