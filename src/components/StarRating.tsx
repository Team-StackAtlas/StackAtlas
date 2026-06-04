import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface StarRatingProps {
  /** 0–5, quarter-star precision. */
  value: number;
  size?: number;
  className?: string;
}

/** Read-only star display with fractional (quarter-star) fill. */
export default function StarRating({ value, size = 16, className }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-slate-300 dark:text-zinc-600" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star size={size} className="text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
