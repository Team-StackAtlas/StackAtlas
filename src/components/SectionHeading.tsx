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
      <p className="text-sm text-slate-500 dark:text-zinc-400">
        <span className="font-semibold text-slate-900 dark:text-zinc-100">{count.toLocaleString()}</span>{' '}
        {count === 1 ? label : `${label}s`}
      </p>
      {action}
    </div>
  );
}
