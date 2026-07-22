// Categorized "Sources" card shared by substance, brand, and stack pages.
// Groups linked research by evidence category (strongest first) so research
// on file reads as organized evidence instead of one undifferentiated list.

import {
  BadgeCheck,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FlaskConical,
  MessagesSquare,
  Microscope,
  Rat,
  Stethoscope,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { sourceHref, type PublicSource } from '../services/research';

const SOURCE_TYPE_META: { type: string; label: string; Icon: LucideIcon }[] = [
  { type: 'review_or_meta_analysis', label: 'Reviews & meta-analyses', Icon: Microscope },
  { type: 'human_study', label: 'Human studies', Icon: Users },
  { type: 'animal_study', label: 'Animal studies', Icon: Rat },
  { type: 'in_vitro_or_mechanistic', label: 'In vitro & mechanistic', Icon: FlaskConical },
  { type: 'coa_or_testing_document', label: 'Testing & COAs', Icon: ClipboardCheck },
  { type: 'official_label_or_document', label: 'Official labels & documents', Icon: BadgeCheck },
  { type: 'brand_or_vendor_document', label: 'Brand & vendor documents', Icon: Store },
  { type: 'practitioner_source', label: 'Practitioner sources', Icon: Stethoscope },
  { type: 'community_or_influencer_mention', label: 'Community & influencer', Icon: MessagesSquare },
  { type: 'other', label: 'Other references', Icon: FileText },
];

function groupSourcesByType(
  sources: PublicSource[],
): { type: string; label: string; Icon: LucideIcon; items: PublicSource[] }[] {
  const byType = new Map<string, PublicSource[]>();
  for (const source of sources) {
    const key = source.sourceType && SOURCE_TYPE_META.some((m) => m.type === source.sourceType)
      ? source.sourceType
      : 'other';
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(source);
  }
  return SOURCE_TYPE_META.filter((m) => byType.has(m.type)).map((m) => ({
    ...m,
    items: byType.get(m.type)!,
  }));
}

export function ResearchSourcesCard({
  sources,
  entityNoun,
}: {
  sources: PublicSource[];
  entityNoun: string; // "substance" | "brand" | "stack" — used in the intro copy
}) {
  if (sources.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <FileText size={20} className="text-slate-400 dark:text-zinc-500" />
        Sources
        <span className="text-sm font-normal text-slate-400 dark:text-zinc-500">({sources.length})</span>
      </h3>
      <p className="mb-4 text-xs text-slate-500 dark:text-zinc-500">
        Research and reference material on file for this {entityNoun}, grouped by evidence type.
        Listing a source is not an endorsement.
      </p>
      <div className="space-y-5">
        {groupSourcesByType(sources).map(({ type, label, Icon, items }) => (
          <div key={type}>
            <div className="mb-2 flex items-center gap-2">
              <Icon size={15} className="shrink-0 text-slate-400 dark:text-zinc-500" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">{label}</h4>
              <span className="text-xs text-slate-400 dark:text-zinc-500">{items.length}</span>
              <span className="ml-1 h-px flex-1 bg-slate-100 dark:bg-zinc-800" />
            </div>
            <ul className="space-y-2">
              {items.map((source) => {
                const href = sourceHref(source);
                return (
                  <li key={source.id} className="flex items-start gap-2 text-sm">
                    <ExternalLink size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                    <span className="text-slate-600 dark:text-zinc-300">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                          {source.title}
                        </a>
                      ) : (
                        <span className="font-medium">{source.title}</span>
                      )}
                      {source.publication && <span className="text-slate-400 dark:text-zinc-500"> — {source.publication}</span>}
                      {source.year != null && <span className="text-slate-400 dark:text-zinc-500"> ({source.year})</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
