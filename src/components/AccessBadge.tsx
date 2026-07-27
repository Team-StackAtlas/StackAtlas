import { Classification } from '../data/mockData';
import { cn } from '../lib/utils';

interface ClassificationBadgeProps {
  classification?: Classification;
  className?: string;
}

// Deeper fills + pure white glyphs: at 10px bold these badges need a 4.5:1
// ratio, which the -500 fills with tinted text missed (measured 2.35).
const STYLES: Record<Classification, string> = {
  Everyday: 'bg-emerald-700 text-white',
  Clinical: 'bg-blue-600 text-white',
  Frontier: 'bg-purple-600 text-white',
  Unknown: 'bg-slate-600 text-white dark:bg-zinc-600',
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
