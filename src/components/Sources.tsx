import { ExternalLink } from 'lucide-react';
import { SaveButton } from './SaveButton';
import { BRANDS, getSources, STACKS, SUPPLEMENTS, type SourceSection, type SourceTargetType } from '../data/mockData';

interface SourcesProps {
  targetType: SourceTargetType;
  targetId: string;
  section: SourceSection;
  /** Optional heading; defaults to "Sources". */
  label?: string;
}

/**
 * Renders the sources attached to a specific catalog claim/section. Renders
 * nothing when there are no sources, so it can be dropped under any claim.
 */
export default function Sources({ targetType, targetId, section, label = 'Sources' }: SourcesProps) {
  const sources = getSources(targetType, targetId, section);
  const relatedName = targetType === 'substance'
    ? SUPPLEMENTS.find((item) => item.id === targetId)?.name
    : targetType === 'brand'
      ? BRANDS.find((item) => item.id === targetId)?.name
      : STACKS.find((item) => item.id === targetId)?.name;
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-zinc-800/50">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
        {label}
      </p>
      <ul className="space-y-1.5">
        {sources.map((source) => (
          <li key={source.id} className="flex items-start justify-between gap-2">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-1.5 text-xs text-slate-600 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
            >
              <ExternalLink size={12} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-medium group-hover:underline">{source.title}</span>
                {source.publisher && (
                  <span className="text-slate-400 dark:text-zinc-500"> — {source.publisher}</span>
                )}
                <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {source.sourceType}
                </span>
              </span>
            </a>
            <SaveButton id={source.id} type="source" className="h-7 w-7 shrink-0 p-1" metadata={{ title: source.title, url: source.url, siteName: source.publisher, relatedType: source.targetType, relatedId: source.targetId, relatedName }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
