import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, Flag } from 'lucide-react';
import { STACKS, SUBSTANCES, getPosts } from '../data/mockData';
import PostCard from '../components/PostCard';
import SuggestEditModal from '../components/SuggestEditModal';
import ReportModal from '../components/ReportModal';
import Sources from '../components/Sources';
import AccessBadge from '../components/AccessBadge';
import { CompareModal } from '../components/CompareModal';
import { AdminObjectActions } from '../components/AdminObjectActions';
import { HideItemButton } from '../components/HideItemButton';

export default function StackPage() {
  const { id } = useParams<{ id: string }>();
  const stack = STACKS.find(s => s.id === id);
  
  const [isSuggestEditOpen, setIsSuggestEditOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  if (!stack) {
    return <div className="text-center py-20 text-zinc-400">Stack not found.</div>;
  }

  const relatedPosts = getPosts().filter(p => p.stackId === stack.id);
  const relatedDispatches = relatedPosts.filter(p => p.type === 'Dispatch');
  const relatedSignals = relatedPosts.filter(p => p.type === 'Signal');

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
              <HideItemButton id={stack.id} name={stack.name} type="stack" />
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
              {stack.name}
            </h1>
            <button 
              onClick={() => setIsCompareOpen(true)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            >
              Compare
            </button>
          </div>
          
          <div className="max-w-2xl mb-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1">Purpose</h3>
            <p className="text-lg text-slate-600 dark:text-zinc-400">{stack.description}</p>
            <Sources targetType="stack" targetId={stack.id} section="stack_description" />
          </div>

          {stack.substances && stack.substances.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Substances in this Stack</h3>
              <div className="space-y-2">
                {stack.substances.map((component, i) => {
                  const substance = SUBSTANCES.find(s => s.id === component.id);
                  return (
                    <Link
                      key={i}
                      to={`/substance/${component.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-zinc-100">
                        {substance && <AccessBadge classification={substance.classification} />}
                        {component.name}
                      </span>
                      {substance?.averageDosage && (
                        <span className="text-xs text-slate-500 dark:text-zinc-400">{substance.averageDosage}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {stack.markers && stack.markers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-2">Common reasons people combine these</h3>
              <div className="flex flex-wrap gap-2">
                {stack.markers.map((marker, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {marker}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AdminObjectActions targetType="stack" targetId={stack.id} targetName={stack.name} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-4">Related Dispatches</h2>
        <div className="space-y-4">
          {relatedDispatches.length > 0 ? (
            relatedDispatches.map(post => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-zinc-500 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-900/50">
              <p>No Dispatches yet for this stack.</p>
            </div>
          )}
        </div>
      </div>

      {relatedSignals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-4">Related Signals</h2>
          <div className="space-y-4">
            {relatedSignals.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        </div>
      )}

      <SuggestEditModal 
        isOpen={isSuggestEditOpen} 
        onClose={() => setIsSuggestEditOpen(false)} 
        entityType="stack" 
        targetId={stack.id}
        entityName={stack.name} 
      />
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        entityName={stack.name}
        targetType="stack"
        targetId={stack.id}
      />
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        type="stack"
        baseItemId={stack.id}
      />
    </div>
  );
}
