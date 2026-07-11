import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone = 'slate' | 'green' | 'blue' | 'amber' | 'red' | 'purple';

const TONE_STYLES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
};

/** Small pill badge used across the admin research tools for status/type labels. */
export default function Badge({
  tone = 'slate',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
