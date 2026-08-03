import type { ComponentType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ACCENTS, type Accent } from './accents';

interface ChoiceCardProps {
  accent: Accent;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  title: ReactNode;
  description: string;
  bullets?: string[];
  cta: string;
  /** Render as a Link when given, otherwise as a button with onClick. */
  to?: string;
  onClick?: () => void;
}

/**
 * The Create-page chooser card: gradient top strip, glowing icon tile,
 * benefit bullets, and a colored arrow CTA that nudges on hover. Use for any
 * "pick a path" surface so choosers read identically across the app.
 */
export function ChoiceCard({ accent, icon: Icon, title, description, bullets, cta, to, onClick }: ChoiceCardProps) {
  const kit = ACCENTS[accent];
  const shell = cn(
    'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900',
    kit.cardInteractive,
  );
  const body = (
    <>
      <div className={kit.topBar} />
      <div className="flex flex-1 flex-col p-6">
        <div className={kit.iconTile}>
          <Icon size={24} className="text-white" />
        </div>
        <h3 className="flex items-center gap-1.5 text-xl font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">{description}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-4 flex-1 space-y-2">
            {bullets.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-zinc-300">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', kit.dot)} aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        )}
        <span className={cn('mt-5 inline-flex items-center gap-1 text-sm font-bold', kit.cta)}>
          {cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </>
  );
  return to
    ? <Link to={to} className={shell}>{body}</Link>
    : <button type="button" onClick={onClick} className={shell}>{body}</button>;
}
