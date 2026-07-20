import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type EmptyStateAction = { label: string; to: string } | { label: string; onClick: () => void };

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  action?: EmptyStateAction;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/50', className)}>
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
          <Icon size={22} className="text-slate-500 dark:text-zinc-400" />
        </div>
      )}
      {title && <h3 className="font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>}
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-zinc-400">{description}</p>}
      {action && (
        'to' in action ? (
          <Link to={action.to} className="mt-5 inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">{action.label}</Link>
        ) : (
          <button type="button" onClick={action.onClick} className="mt-5 inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">{action.label}</button>
        )
      )}
    </div>
  );
}
