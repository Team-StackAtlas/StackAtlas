import type { ReactNode } from 'react';

/**
 * Compact section label for the Map's content area: a pluralized result
 * count ("788 substances" / "1 substance") plus an optional trailing action
 * (e.g. a "Create Stack" button or a sync indicator).
 */
export function SectionHeading({ label, count, action }: {
  label: string;
  count: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">
        {count.toLocaleString()} {count === 1 ? label : `${label}s`}
      </p>
      {action}
    </div>
  );
}
