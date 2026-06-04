import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Flag, Link as LinkIcon } from 'lucide-react';
import { BRANDS, getPosts, SUPPLEMENTS } from '../data/mockData';
import PostCard from '../components/PostCard';
import SuggestEditModal from '../components/SuggestEditModal';
import ReportModal from '../components/ReportModal';
import { SaveButton } from '../components/SaveButton';
import { CompareModal } from '../components/CompareModal';
import { AdminObjectActions } from '../components/AdminObjectActions';
import { HideItemButton } from '../components/HideItemButton';

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  const brand = BRANDS.find(b => b.id === id);
  
  const [isSuggestEditOpen, setIsSuggestEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  if (!brand) {
    return <div className="text-center py-20 text-zinc-400">Brand not found.</div>;
  }

  const relatedPosts = getPosts().filter(p => p.brandId === brand.id);

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full pb-8 px-4 pt-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-zinc-800 pb-8">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Link 
              to="/square"
              className="flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Square
            </Link>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSuggestEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
              >
                <Edit3 size={14} />
                Suggest Edit
              </button>
              <HideItemButton id={brand.id} name={brand.name} type="brand" />
              <button 
                onClick={() => setIsReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-zinc-800/50 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-slate-200 dark:border-zinc-700"
              >
                <Flag size={14} />
                Report
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              {brand.name}
            </h1>
            <SaveButton id={brand.id} type="brand" className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800" />
            <button 
              onClick={() => setIsCompareOpen(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Compare
            </button>
          </div>
          
          {/* Markers */}
          {brand.markers && brand.markers.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {brand.markers.map((marker, i) => (
                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-xs font-medium text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  {marker}
                </span>
              ))}
            </div>
          )}

          <div className="text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mb-4">
            {brand.description || ''}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
             <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">User Rating</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{brand.userRating} / 5</p>
             </div>
             <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">Shipping Reliability</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-zinc-100">{brand.shippingReliability} / 5</p>
             </div>
             <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
                <p className="text-xs text-slate-500 dark:text-zinc-500 mb-1">Contamination Reports</p>
                <p className={`text-lg font-semibold ${brand.contaminationReports > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {brand.contaminationReports}
                </p>
             </div>
          </div>

          {brand.products && brand.products.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Associated Products</h3>
              <div className="flex flex-wrap gap-2">
                {brand.products.map((productId, i) => {
                  const supplement = SUPPLEMENTS.find(s => s.id === productId);
                  return (
                    <Link 
                      key={i} 
                      to={`/supplement/${productId}`}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-sm font-medium text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {supplement ? supplement.name : productId}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {brand.thirdPartyTestingLinks && brand.thirdPartyTestingLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">3rd Party Testing</h3>
              <div className="flex flex-wrap gap-3">
                {brand.thirdPartyTestingLinks.map((link, i) => (
                  <a 
                    key={i} 
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:underline"
                  >
                    <LinkIcon size={14} />
                    View Report {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminObjectActions targetType="brand" targetId={brand.id} targetName={brand.name} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-6">Dispatches & Signals</h2>
        <div className="space-y-4">
          {relatedPosts.length > 0 ? (
            relatedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-900/50">
              <p>No posts yet for this brand.</p>
            </div>
          )}
        </div>
      </div>

      <SuggestEditModal 
        isOpen={isSuggestEditOpen} 
        onClose={() => setIsSuggestEditOpen(false)} 
        entityType="brand" 
        entityName={brand.name} 
      />
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        entityName={brand.name}
        targetType="brand"
        targetId={brand.id}
      />
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        type="brand"
        baseItemId={brand.id}
      />
    </div>
  );
}
