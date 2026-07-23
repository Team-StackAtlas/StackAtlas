import { useEffect, useState, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TYPE_TAGS } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import {
  Activity,
  Beaker,
  Package,
  Link as LinkIcon,
  Star,
  ShieldAlert,
  AlertTriangle,
  Timer,
  Repeat,
  ArrowLeft,
  Users,
  Edit3,
  Info,
  Microscope,
  MessageSquare,
} from 'lucide-react';
import PostCard from '../components/PostCard';
import SuggestEditModal from '../components/SuggestEditModal';
import AccessBadge from '../components/AccessBadge';
import Sources from '../components/Sources';
import { useFollowing } from '../hooks/useFollowing';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { getCanonicalCategories } from '../lib/bearings';
import { CompareModal } from '../components/CompareModal';
import { HideItemButton } from '../components/HideItemButton';
import { supabase } from '../services/supabase/client';
import { listApprovedFindings, listSubstanceSources, type PublicFinding, type PublicSource } from '../services/research';
import { ResearchSourcesCard } from '../components/ResearchSourcesCard';
import { studyTypeLabel } from '../components/admin/adminLabels';
import { EmptyState } from '../components/EmptyState';
import { EntityNotFound } from '../components/EntityNotFound';
import { GlossaryText } from '../components/GlossaryText';
import { TYPE_TAG_ICONS } from '../lib/typeTagIcons';
import { displayName } from '../lib/substanceName';
import { usePageMeta } from '../hooks/usePageMeta';

// 'mixed' reads as "Mixed results" here (not admin's shorter "Mixed") per the
// public copy spec, so this map isn't reused from adminLabels.ts.
const FINDING_DIRECTION_LABELS: Record<PublicFinding['direction'], string> = {
  increased: 'Increased',
  decreased: 'Decreased',
  no_clear_change: 'No clear change',
  mixed: 'Mixed results',
  unclear: 'Unclear',
};

const RISK_LEVEL_STYLES: Record<'Low' | 'Moderate' | 'High', string> = {
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Moderate: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  High: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

/** Fact value that clamps long prose to three lines with a Show more toggle.
 * Imported catalog values (e.g. half-life) can be full paragraphs; rendered
 * unclamped at display size they stretch the whole tile row into towers of
 * empty space. Short values keep the big stat treatment. */
function ExpandableValue({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= 60) {
    return <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{text}</p>;
  }
  return (
    <div>
      <p className={`text-sm font-medium leading-relaxed text-slate-700 dark:text-zinc-300 ${open ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-1.5 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

/** Capitalizes the first letter so single-word and full-sentence effects
 * read consistently in a list. */
function sentenceCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

/** One row in the "At a glance" facts panel: small label, value below. Long
 * values clamp via ExpandableValue so imported prose doesn't blow out the rail. */
function StatRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{children}</div>
    </div>
  );
}

export default function SupplementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS } = useCatalog();
  const { posts: allPosts } = usePosts();
  const supplement = SUPPLEMENTS.find(s => s.id === id);
  usePageMeta(supplement?.name ?? 'Substance', supplement?.description);

  const [isSuggestEditOpen, setIsSuggestEditOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { isFollowing, toggleFollow } = useFollowing();
  const { services, isBackendConfigured } = useAuth();
  const [followerCount, setFollowerCount] = useState(0);
  const [findings, setFindings] = useState<PublicFinding[]>([]);
  const [sources, setSources] = useState<PublicSource[]>([]);

  useEffect(() => {
    if (!supplement) return;
    if (isBackendConfigured && services) {
      services.follows.count({ targetType: 'substance', targetId: supplement.id }).then(setFollowerCount).catch(() => setFollowerCount(isFollowing('substance', supplement.id) ? 1 : 0));
    } else {
      Promise.resolve().then(() => setFollowerCount(isFollowing('substance', supplement.id) ? 1 : 0));
    }
  }, [isBackendConfigured, isFollowing, services, supplement]);

  useEffect(() => {
    if (!supplement || !supabase) return;
    let cancelled = false;
    listApprovedFindings(supabase, supplement.id)
      .then((rows) => {
        if (!cancelled) setFindings(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setFindings([]);
      });
    listSubstanceSources(supabase, supplement.id)
      .then((rows) => {
        if (!cancelled) setSources(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setSources([]);
      });
    return () => {
      cancelled = true;
    };
  }, [supplement]);

  const handleSubstanceFollow = async () => {
    if (!supplement) return;
    await toggleFollow('substance', supplement.id);
    if (isBackendConfigured && services) {
      services.follows.count({ targetType: 'substance', targetId: supplement.id }).then(setFollowerCount).catch(() => undefined);
    } else {
      setFollowerCount(isFollowing('substance', supplement.id) ? 0 : 1);
    }
  };

  if (!supplement) {
    return <EntityNotFound label="Substance" />;
  }

  const popularBrand = BRANDS.find(b => b.id === supplement.mostPopularBrandId);
  const relatedBrands = BRANDS.filter(
    b => b.products?.includes(supplement.id) || b.productCatalog?.some(p => p.substanceId === supplement.id),
  );
  const relatedPosts = allPosts.filter(p => p.supplementId === supplement.id);
  // Global Average is derived ONLY from sufficiently complete Comprehensive
  // Dispatches (quality >= 90 with a recorded dosage).
  const comprehensiveDispatches = relatedPosts.filter(
    p => p.type === 'Dispatch' && p.qualityScore >= 90 && p.logDetails?.dosage,
  );
  const globalAverageDose =
    comprehensiveDispatches.length > 0
      ? supplement.globalAverage ?? comprehensiveDispatches[0].logDetails?.dosage ?? null
      : null;

  const categories = getCanonicalCategories(supplement.paths.map(path => path.category));
  const { primary: displayPrimary, acronym: displayAcronym, altNames } = displayName(supplement);

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <Link
        to="/map"
        className="flex w-fit items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Map
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-5 border-b border-slate-200 dark:border-zinc-800 pb-7">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map(category => (
              <Link
                key={category}
                to={`/map?category=${encodeURIComponent(category)}`}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {category}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {displayAcronym ? (
                  <>
                    <span>{displayAcronym}</span>
                    <span className="font-bold text-slate-400 dark:text-zinc-500"> · {displayPrimary}</span>
                  </>
                ) : displayPrimary}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" title="Classification">
                <AccessBadge classification={supplement.classification} />
                {supplement.classification}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">{followerCount} followers</span>
            </div>

            {supplement.typeTags.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {supplement.typeTags.map((tag, i) => {
                  const typeInfo = TYPE_TAGS.find(t => t.full === tag);
                  const TagIcon = TYPE_TAG_ICONS[tag];
                  return typeInfo ? (
                    <span key={`type-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-sm font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700" title={tag}>
                      {TagIcon && <TagIcon size={14} className="text-slate-400 dark:text-zinc-500" />}
                      {typeInfo.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {supplement.markers && supplement.markers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {supplement.markers.map((marker, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    {marker}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-zinc-400 leading-relaxed">
              <GlossaryText>{supplement.description}</GlossaryText>
            </p>
            {altNames.length > 0 && (
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-zinc-500">
                <span className="font-semibold text-slate-600 dark:text-zinc-400">Also known as:</span>{' '}
                {altNames.join(' · ')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            <div className="flex gap-2 w-full">
              <button
                onClick={handleSubstanceFollow}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors shadow-sm ${
                  isFollowing('substance', supplement.id)
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                    : 'bg-emerald-500 text-white dark:text-zinc-950 hover:bg-emerald-600 dark:hover:bg-emerald-400'
                }`}
              >
                {isFollowing('substance', supplement.id) ? 'Following' : 'Follow Substance'}
              </button>
              <button
                onClick={() => setIsCompareOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-2 font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Compare
              </button>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setIsSuggestEditOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
              >
                <Edit3 size={14} />
                Suggest Edit
              </button>
              <HideItemButton id={supplement.id} name={supplement.name} type="substance" />
            </div>
          </div>
        </div>
      </div>

      {/* Body: facts rail + detail sections */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Facts rail — surfaces first on mobile, sits to the right on desktop */}
        <aside className="order-1 lg:order-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 lg:sticky lg:top-6">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">At a glance</h3>

            <div className="rounded-xl bg-emerald-50/70 p-3 ring-1 ring-inset ring-emerald-500/10 dark:bg-emerald-500/5 dark:ring-emerald-400/10">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                <Activity size={12} /> Reported dose range
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-zinc-100">
                {supplement.clinicalBaseline?.dosage || supplement.averageDosage}
              </p>
              {supplement.clinicalBaseline?.links && supplement.clinicalBaseline.links.length > 0 && (
                <a
                  href={supplement.clinicalBaseline.links[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <LinkIcon size={11} /> Source
                </a>
              )}
              <div
                className={`mt-2.5 border-t border-emerald-500/10 pt-2.5 dark:border-emerald-400/10 ${globalAverageDose ? 'cursor-pointer' : ''}`}
                onClick={() => globalAverageDose && navigate(`/square?substance=${supplement.id}&filter=dosage`)}
              >
                <p className="mb-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-500"><Users size={11} /> Global average</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  {globalAverageDose ? (
                    <>{globalAverageDose} <span className="text-xs font-normal text-slate-500">(Comprehensive Dispatches)</span></>
                  ) : (
                    <span className="text-sm font-normal text-slate-500 dark:text-zinc-400">Not enough Comprehensive Dispatch data</span>
                  )}
                </p>
              </div>
              <Sources targetType="substance" targetId={supplement.id} section="dosage" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {supplement.halfLife && (
                <StatRow icon={<Timer size={12} />} label="Half-life"><ExpandableValue text={supplement.halfLife} /></StatRow>
              )}
              {supplement.lengthOfCycle && (
                <StatRow icon={<Repeat size={12} />} label="Cycle length"><ExpandableValue text={supplement.lengthOfCycle} /></StatRow>
              )}
              {supplement.toleranceBuildup && (
                <StatRow icon={<Beaker size={12} />} label="Tolerance buildup"><ExpandableValue text={supplement.toleranceBuildup} /></StatRow>
              )}
              {supplement.riskLevel && (
                <StatRow icon={<AlertTriangle size={12} />} label="Risk level">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${RISK_LEVEL_STYLES[supplement.riskLevel]}`}>{supplement.riskLevel}</span>
                </StatRow>
              )}
              {supplement.formula && (
                <StatRow icon={<Beaker size={12} />} label="Molecular formula"><span className="font-mono text-sm">{supplement.formula}</span></StatRow>
              )}
              {supplement.origin && (
                <StatRow icon={<Info size={12} />} label="Origin"><span className="text-sm font-normal text-slate-700 dark:text-zinc-300"><GlossaryText>{supplement.origin}</GlossaryText></span></StatRow>
              )}
              {supplement.howObtained && (
                <StatRow icon={<Info size={12} />} label="How it's obtained"><span className="text-sm font-normal text-slate-700 dark:text-zinc-300"><GlossaryText>{supplement.howObtained}</GlossaryText></span></StatRow>
              )}
              {popularBrand && (
                <StatRow icon={<Star size={12} />} label="Most popular brand">
                  <Link to={`/brand/${popularBrand.id}`} className="text-sm font-semibold text-slate-900 hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-400">{popularBrand.name}</Link>
                </StatRow>
              )}
            </div>

            <p className="text-[11px] leading-snug text-slate-400 dark:text-zinc-500">
              For informational purposes only — not medical advice. Consult a qualified professional before changing any regimen.
            </p>
          </div>
        </aside>

        {/* Detail sections */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
      {/* Health Risks & Side Effects */}
      {supplement.healthRisks.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <ShieldAlert size={20} className="text-amber-500" />
            Health Risks & Side Effects
          </h3>
          <ul className="space-y-2">
            {supplement.healthRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                <span><GlossaryText>{risk}</GlossaryText></span>
              </li>
            ))}
          </ul>
          <Sources targetType="substance" targetId={supplement.id} section="side_effects" />
        </div>
      )}

      {/* Research Findings */}
      {findings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Microscope size={20} className="text-slate-400 dark:text-zinc-500" />
            Research Findings
          </h3>
          <p className="mb-4 text-xs text-slate-500 dark:text-zinc-500">
            Findings from reviewed sources. Informational only — not medical advice.
          </p>
          <div className="space-y-4">
            {findings.map((finding) => {
              const metaParts = [
                finding.population,
                finding.doseAmount != null && finding.doseUnit ? `${finding.doseAmount}${finding.doseUnit}` : null,
                finding.frequency,
                finding.duration,
                finding.studyType ? studyTypeLabel(finding.studyType) : null,
              ].filter((part): part is string => Boolean(part));
              const sourceHref = finding.source
                ? (finding.source.url ??
                    (finding.source.doi ? `https://doi.org/${finding.source.doi}` : null) ??
                    (finding.source.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${finding.source.pmid}/` : null))
                : null;
              const sourceSuffix = finding.source
                ? [finding.source.publication, finding.source.year != null ? String(finding.source.year) : null]
                    .filter((part): part is string => Boolean(part))
                    .join(', ')
                : '';
              return (
                <div key={finding.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-zinc-100">{finding.endpoint}</h4>
                    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
                      {FINDING_DIRECTION_LABELS[finding.direction]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300"><GlossaryText>{finding.summary}</GlossaryText></p>
                  {metaParts.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{metaParts.join(' · ')}</p>
                  )}
                  {finding.limitations && (
                    <p className="mt-1 text-xs italic text-slate-400 dark:text-zinc-500">Limitations: <GlossaryText>{finding.limitations}</GlossaryText></p>
                  )}
                  {finding.source && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
                      {sourceHref ? (
                        <a
                          href={sourceHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {finding.source.title}
                        </a>
                      ) : (
                        finding.source.title
                      )}
                      {sourceSuffix && ` — ${sourceSuffix}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Research on file — sources linked to this substance, grouped by
          evidence category (strongest first) rather than one flat list. */}
      <ResearchSourcesCard sources={sources} entityNoun="substance" />

      {/* Subjective Effects */}
      {supplement.subjectiveEffects.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Activity size={20} className="text-emerald-500" />
            Subjective Effects
          </h3>
          <p className="mb-4 text-xs text-slate-500 dark:text-zinc-500">
            Commonly reported first-hand experiences. Anecdotal, not medical claims.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {supplement.subjectiveEffects.map((effect, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-zinc-300">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span>{sentenceCase(effect)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Possible Pairings */}
      {supplement.possiblePairings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Beaker size={20} className="text-slate-400 dark:text-zinc-500" />
            Possible Pairings
          </h3>
          <div className="flex flex-wrap gap-2">
            {supplement.possiblePairings.map((pairing, i) => {
              const match = SUPPLEMENTS.find(s => s.name.toLowerCase() === pairing.toLowerCase());
              return match ? (
                <Link
                  key={i}
                  to={`/substance/${match.id}`}
                  className="rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-1 text-sm text-slate-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  + {pairing}
                </Link>
              ) : (
                <span key={i} className="rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-1 text-sm text-slate-700 dark:text-zinc-300">
                  + {pairing}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Brands */}
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Package size={20} className="text-slate-400 dark:text-zinc-500" />
          Brand Reliability
        </h3>
        {relatedBrands.length > 0 ? (
          <div className="space-y-4">
            {relatedBrands.map(brand => (
              <div key={brand.id} className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 dark:text-zinc-100">{brand.name}</h4>
                  <div className="flex items-center gap-1 text-sm font-medium text-amber-500 dark:text-amber-400">
                    <Star size={14} className="fill-amber-500 dark:fill-amber-400" />
                    {brand.userRating}/5
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-slate-500 dark:text-zinc-500 mb-1">Shipping</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(brand.shippingReliability / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-600 dark:text-zinc-300 text-xs w-6">{brand.shippingReliability}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-slate-500 dark:text-zinc-500 mb-1">Contamination</span>
                    <span className={`font-medium ${brand.contaminationReports > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {brand.contaminationReports} Reports
                    </span>
                  </div>
                </div>

                {brand.thirdPartyTestingLinks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800/50">
                    <span className="block text-xs text-slate-500 dark:text-zinc-500 mb-2">3rd Party Testing</span>
                    <div className="flex flex-wrap gap-2">
                      {brand.thirdPartyTestingLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline"
                        >
                          <LinkIcon size={12} />
                          View Report {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">No brand records linked to this substance yet.</p>
        )}
      </div>
        </div>
      </div>

      {/* Related Dispatches & Signals */}
      <div className="mt-10 border-t border-slate-200 pt-8 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Related Dispatches & Signals</h2>
          <button
            onClick={() => navigate(`/square?substance=${supplement.id}`)}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
          >
            View all in Square <ArrowLeft className="rotate-180" size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {relatedPosts.length > 0 ? (
            relatedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No discussions yet"
              description="Be the first to share your experience with this substance."
              action={{ label: 'Create Post', to: '/create' }}
            />
          )}
        </div>
      </div>

      <SuggestEditModal
        isOpen={isSuggestEditOpen}
        onClose={() => setIsSuggestEditOpen(false)}
        entityType="substance"
        targetId={supplement.id}
        entityName={supplement.name}
      />
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        type="substance"
        baseItemId={supplement.id}
      />
    </div>
  );
}
