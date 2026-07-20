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
import { listApprovedFindings, type PublicFinding } from '../services/research';
import { studyTypeLabel } from '../components/admin/adminLabels';
import { EmptyState } from '../components/EmptyState';

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

function FactTile({ icon, label, className = '', children }: { icon: ReactNode; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-wide">{label}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SupplementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { substances: SUPPLEMENTS, brands: BRANDS } = useCatalog();
  const { posts: allPosts } = usePosts();
  const supplement = SUPPLEMENTS.find(s => s.id === id);

  const [isSuggestEditOpen, setIsSuggestEditOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { isFollowing, toggleFollow } = useFollowing();
  const { services, isBackendConfigured } = useAuth();
  const [followerCount, setFollowerCount] = useState(0);
  const [findings, setFindings] = useState<PublicFinding[]>([]);

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
    return <div className="text-center py-20 text-zinc-400">Substance not found.</div>;
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full pb-8">
      <Link
        to="/"
        className="flex w-fit items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Map
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-slate-200 dark:border-zinc-800 pb-8">
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{supplement.name}</h1>
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
                  return typeInfo ? (
                    <span key={`type-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-sm font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700" title={tag}>
                      {typeInfo.emoji} {typeInfo.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}

            {supplement.markers && supplement.markers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {supplement.markers.map((marker, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                    {marker}
                  </span>
                ))}
              </div>
            )}

            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-zinc-400 leading-relaxed">
              {supplement.description}
            </p>
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

      {/* Key Facts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FactTile icon={<Activity size={16} />} label="Reported Dose Range" className="col-span-2">
          <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
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
            className={`mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/50 -mx-1 px-1 rounded transition-colors ${globalAverageDose ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50' : ''}`}
            onClick={() => globalAverageDose && navigate(`/square?substance=${supplement.id}&filter=dosage`)}
          >
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-1 flex items-center gap-1"><Users size={12} /> Global Average</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
              {globalAverageDose ? (
                <>{globalAverageDose} <span className="text-xs font-normal text-slate-500">(Comprehensive Dispatches)</span></>
              ) : (
                <span className="text-slate-500 dark:text-zinc-400 font-normal text-sm">Not enough Comprehensive Dispatch data</span>
              )}
            </p>
          </div>

          <p className="mt-3 text-[11px] leading-snug text-slate-400 dark:text-zinc-500">
            For informational purposes only — not medical advice. Consult a qualified professional
            before changing any regimen.
          </p>

          <Sources targetType="substance" targetId={supplement.id} section="dosage" />
        </FactTile>

        {supplement.halfLife && (
          <FactTile icon={<Timer size={16} />} label="Half-life">
            <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{supplement.halfLife}</p>
          </FactTile>
        )}

        {supplement.lengthOfCycle && (
          <FactTile icon={<Repeat size={16} />} label="Cycle Length">
            <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{supplement.lengthOfCycle}</p>
          </FactTile>
        )}

        {supplement.toleranceBuildup && (
          <FactTile icon={<Beaker size={16} />} label="Tolerance Buildup">
            <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{supplement.toleranceBuildup}</p>
          </FactTile>
        )}

        {supplement.riskLevel && (
          <FactTile icon={<AlertTriangle size={16} />} label="Risk Level">
            <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold ${RISK_LEVEL_STYLES[supplement.riskLevel]}`}>
              {supplement.riskLevel}
            </span>
          </FactTile>
        )}

        {popularBrand && (
          <FactTile icon={<Star size={16} />} label="Most Popular Brand">
            <Link
              to={`/brand/${popularBrand.id}`}
              className="text-lg font-semibold text-slate-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {popularBrand.name}
            </Link>
          </FactTile>
        )}
      </div>

      {/* Origin & Sourcing */}
      {(supplement.origin || supplement.howObtained || supplement.formula) && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Info size={20} className="text-slate-500" />
            Origin & Sourcing
          </h3>
          <dl className="space-y-3 text-sm">
            {supplement.origin && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-zinc-500 mb-0.5">Origin</dt>
                <dd className="text-slate-700 dark:text-zinc-300">{supplement.origin}</dd>
              </div>
            )}
            {supplement.howObtained && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-zinc-500 mb-0.5">How it's obtained</dt>
                <dd className="text-slate-700 dark:text-zinc-300">{supplement.howObtained}</dd>
              </div>
            )}
          </dl>
          {supplement.formula && (
            <p className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50 font-mono text-xs text-slate-500 dark:text-zinc-400">
              {supplement.formula}
            </p>
          )}
        </div>
      )}

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
                {risk}
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
            <Microscope size={20} className="text-indigo-500" />
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
                  <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">{finding.summary}</p>
                  {metaParts.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">{metaParts.join(' · ')}</p>
                  )}
                  {finding.limitations && (
                    <p className="mt-1 text-xs italic text-slate-400 dark:text-zinc-500">Limitations: {finding.limitations}</p>
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

      {/* Subjective Effects */}
      {supplement.subjectiveEffects.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Activity size={20} className="text-emerald-500" />
            Subjective Effects
          </h3>
          <div className="flex flex-wrap gap-2">
            {supplement.subjectiveEffects.map((effect, i) => (
              <span key={i} className="rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-1 text-sm text-slate-700 dark:text-zinc-300">
                {effect}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Possible Pairings */}
      {supplement.possiblePairings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Beaker size={20} className="text-blue-500" />
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
          <Package size={20} className="text-indigo-500" />
          Brand Reliability Database
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

      {/* Related Dispatches & Signals */}
      <div className="pt-4">
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
