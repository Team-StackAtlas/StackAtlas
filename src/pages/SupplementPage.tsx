import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SUPPLEMENTS, BRANDS, getPosts, TYPE_TAGS } from '../data/mockData';
import { ShieldCheck, Activity, Beaker, Package, Link as LinkIcon, Star, ShieldAlert, Clock, ArrowLeft, Users, Edit3, Flag } from 'lucide-react';
import PostCard from '../components/PostCard';
import SuggestEditModal from '../components/SuggestEditModal';
import ReportModal from '../components/ReportModal';
import AccessBadge from '../components/AccessBadge';
import Sources from '../components/Sources';
import { SaveButton } from '../components/SaveButton';
import { useFollowing } from '../hooks/useFollowing';
import { CompareModal } from '../components/CompareModal';
import { AdminObjectActions } from '../components/AdminObjectActions';
import { HideItemButton } from '../components/HideItemButton';

export default function SupplementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supplement = SUPPLEMENTS.find(s => s.id === id);
  
  const [isSuggestEditOpen, setIsSuggestEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { isFollowing, toggleFollow } = useFollowing();

  if (!supplement) {
    return <div className="text-center py-20 text-zinc-400">Substance not found.</div>;
  }

  const popularBrand = BRANDS.find(b => b.id === supplement.mostPopularBrandId);
  const relatedPosts = getPosts().filter(p => p.supplementId === supplement.id);
  // Global Average is derived ONLY from sufficiently complete Comprehensive
  // Dispatches (quality >= 90 with a recorded dosage).
  const comprehensiveDispatches = relatedPosts.filter(
    p => p.type === 'Dispatch' && p.qualityScore >= 90 && p.logDetails?.dosage,
  );
  const globalAverageDose =
    comprehensiveDispatches.length > 0
      ? supplement.globalAverage ?? comprehensiveDispatches[0].logDetails?.dosage ?? null
      : null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-zinc-800 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <Link 
              to="/"
              className="flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Map
            </Link>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSuggestEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
              >
                <Edit3 size={14} />
                Suggest Edit
              </button>
              <HideItemButton id={supplement.id} name={supplement.name} type="substance" />
              <button 
                onClick={() => setIsReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
              >
                <Flag size={14} />
                Report
              </button>
            </div>
          </div>
          <div className="mb-2 text-xs font-medium text-slate-400 dark:text-zinc-600" title={supplement.paths.map(path => `${path.domain} > ${path.category}`).join(' • ')}>
            {supplement.paths.slice(0, 2).map(path => `${path.domain} / ${path.category}`).join(' • ')}
            {supplement.paths.length > 2 ? ` +${supplement.paths.length - 2} routes` : ''}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{supplement.name}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" title="Classification">
              <AccessBadge classification={supplement.classification} />
              {supplement.classification}
            </span>
            <div className="flex gap-2">
              {supplement.typeTags.map((tag, i) => {
                const typeInfo = TYPE_TAGS.find(t => t.full === tag);
                return typeInfo ? (
                  <span key={`type-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-sm font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700" title={tag}>
                    {typeInfo.emoji} {typeInfo.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
          
          {/* Markers */}
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
        <div className="flex flex-col gap-2 shrink-0 mt-8 sm:mt-0 w-full sm:w-auto">
          <div className="flex gap-2 w-full">
            <SaveButton id={supplement.id} type="substance" className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
            <button
              onClick={() => toggleFollow('substance', supplement.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors shadow-sm ${
                isFollowing('substance', supplement.id)
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                  : 'bg-emerald-500 text-white dark:text-zinc-950 hover:bg-emerald-600 dark:hover:bg-emerald-400'
              }`}
            >
              {isFollowing('substance', supplement.id) ? 'Following' : 'Follow Substance'}
            </button>
          </div>
          <button 
            onClick={() => setIsCompareOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-2 font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Compare
          </button>
        </div>
      </div>

      <AdminObjectActions targetType="substance" targetId={supplement.id} targetName={supplement.name} />

      {/* Summary Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Activity size={18} />
              <h3 className="text-sm font-medium">Dosage</h3>
            </div>
          </div>
          <div className="space-y-3">
            {/* Clinical Baseline */}
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> Clinical Baseline</span>
                {supplement.clinicalBaseline?.links && supplement.clinicalBaseline.links.length > 0 && (
                  <a href={supplement.clinicalBaseline.links[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400" title="View Source">
                    <LinkIcon size={12} />
                  </a>
                )}
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {supplement.clinicalBaseline?.dosage || supplement.averageDosage}
              </p>
            </div>
            
            {/* Global Average — only from Comprehensive Dispatches */}
            <div
              className={`pt-2 border-t border-slate-100 dark:border-zinc-800/50 p-1 -mx-1 rounded transition-colors ${globalAverageDose ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50' : ''}`}
              onClick={() => globalAverageDose && navigate(`/square?substance=${supplement.id}&filter=dosage`)}
            >
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-1 flex items-center gap-1"><Users size={12} /> Global Average</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                {globalAverageDose ? (
                  <>{globalAverageDose} <span className="text-xs font-normal text-slate-500">(Comprehensive Dispatches)</span></>
                ) : (
                  <span className="text-slate-500 dark:text-zinc-400 font-normal">Not enough Comprehensive Dispatch data</span>
                )}
              </p>
            </div>

            {/* Peer Match — placeholder until real matching exists */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/50 p-1 -mx-1 rounded">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1"><Activity size={12} /> Peer Match</p>
              <p className="text-sm font-normal text-slate-500 dark:text-zinc-400">
                Not enough Dispatch data
              </p>
            </div>

            <p className="pt-2 text-[11px] leading-snug text-slate-400 dark:text-zinc-500">
              For informational purposes only — not medical advice. Consult a qualified professional
              before changing any regimen.
            </p>

            <Sources targetType="substance" targetId={supplement.id} section="dosage" />
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
            <Clock size={18} />
            <h3 className="text-sm font-medium">Cycle Length</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1 flex items-center gap-1"><ShieldCheck size={12} /> Expert/Label</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{supplement.lengthOfCycle}</p>
            </div>
            <div 
              className="pt-2 border-t border-slate-100 dark:border-zinc-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 p-1 -mx-1 rounded transition-colors"
              onClick={() => navigate(`/square?substance=${supplement.id}&filter=cycle`)}
            >
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-1 flex items-center gap-1"><Users size={12} /> Community Avg</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{supplement.lengthOfCycle} (from logs)</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
            <Beaker size={18} />
            <h3 className="text-sm font-medium">Tolerance Buildup</h3>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{supplement.toleranceBuildup}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-zinc-400">
            <Star size={18} />
            <h3 className="text-sm font-medium">Most Popular Brand</h3>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{popularBrand?.name || 'N/A'}</p>
        </div>
      </div>

      {/* Detailed Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
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

          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Beaker size={20} className="text-blue-500" />
              Possible Pairings
            </h3>
            <div className="flex flex-wrap gap-2">
              {supplement.possiblePairings.map((pairing, i) => (
                <span key={i} className="rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3 py-1 text-sm text-slate-700 dark:text-zinc-300">
                  + {pairing}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Brand Database Section */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Package size={20} className="text-indigo-500" />
              Brand Reliability Database
            </h3>
            <div className="space-y-4">
              {BRANDS.map(brand => (
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
          </div>
        </div>
      </div>

      {/* Community Discussions */}
      <div className="pt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Live Dispatches & Charts</h2>
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
              <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 border-dashed p-12 text-center bg-white dark:bg-transparent">
                <p className="text-slate-500 dark:text-zinc-500">No discussions yet. Be the first to share your experience!</p>
                <button className="mt-4 rounded-lg bg-slate-900 dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-white dark:text-zinc-200 hover:bg-slate-800 dark:hover:bg-zinc-700 transition-colors">
                  Create Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SuggestEditModal 
        isOpen={isSuggestEditOpen} 
        onClose={() => setIsSuggestEditOpen(false)} 
        entityType="substance" 
        entityName={supplement.name} 
      />
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        entityName={supplement.name}
        targetType="substance"
        targetId={supplement.id}
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
