import { Classification } from '../data/mockData';
import { cn } from '../lib/utils';

interface ClassificationBadgeProps {
  classification?: Classification;
  className?: string;
}

const STYLES: Record<Classification, string> = {
  Everyday: 'bg-emerald-500 text-emerald-50',
  Clinical: 'bg-blue-500 text-blue-50',
  Frontier: 'bg-purple-500 text-purple-50',
  Unknown: 'bg-slate-400 text-white dark:bg-zinc-600',
};

const LABELS: Record<Classification, string> = {
  Everyday: 'E',
  Clinical: 'C',
  Frontier: 'F',
  Unknown: '?',
};

export default function AccessBadge({ classification, className }: ClassificationBadgeProps) {
  const value: Classification = classification ?? 'Unknown';

  return (
    <div
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-sm',
        STYLES[value],
        className,
      )}
      title={value}
    >
      {LABELS[value]}
    </div>
  );
}
