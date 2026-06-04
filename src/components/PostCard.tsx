import { MessageSquare, Clock, Scale, Activity, ShieldCheck, CheckCircle, Droplet, Layers, Award, MoreHorizontal, Flag, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Post, SUPPLEMENTS, BRANDS, STACKS } from '../data/mockData';
import { cn } from '../lib/utils';
import { useUserScope } from '../context/UserScopeContext';
import { useState, useRef, useEffect } from 'react';
import { SaveButton } from './SaveButton';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const { scope } = useUserScope();
  const supplement = SUPPLEMENTS.find(s => s.id === post.supplementId);
  const brand = BRANDS.find(b => b.id === post.brandId);
  const stack = STACKS.find(s => s.id === post.stackId);

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;
    toast('Report submitted successfully.');
    setShowReportModal(false);
    setShowMenu(false);
    setReportReason('');
  };

  const handleSubmitToStackAtlas = () => {
    toast('Submitted for review.');
    setShowMenu(false);
  };

  return (
    <>
      <div className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 transition-all hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/80 shadow-sm">
        {/* Header: User & Meta */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.author.username}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-bold hover:opacity-80 transition-opacity">
              {post.author.username.charAt(0).toUpperCase()}
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 dark:text-zinc-100 hover:underline">{post.author.username}</Link>
                {post.author.isVerified && <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-500" />}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500 mt-0.5">
                {post.author.age && <span>{post.author.age}y</span>}
                {post.author.weight && <span>• {post.author.weight}</span>}
                {post.author.height && <span>• {post.author.height}</span>}
                <span>• {formatDistanceToNow(new Date(post.createdAt))} ago</span>
              </div>
            </div>
          </div>
          {/* Quality Badge & Menu */}
          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {post.isGold && (
              <div
                title="Gold: structured Dispatch with enough required fields for higher-quality review."
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
              >
                <Award size={12} className="text-amber-500" />
                Gold
              </div>
            )}
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
              post.qualityScore >= 90 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" :
              post.qualityScore >= 70 ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" :
              "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
            )}>
              {post.qualityScore >= 90 ? 'Comprehensive' : post.qualityScore >= 70 ? 'Detailed' : 'Basic'} Log
            </div>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-10">
                <button 
                  onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <Flag size={14} />
                  Report
                </button>
                {post.type === 'Dispatch' && (
                  <button 
                    onClick={handleSubmitToStackAtlas}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left border-t border-slate-100 dark:border-zinc-800"
                  >
                    <Send size={14} />
                    Submit to StackAtlas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Context Tags */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
        {supplement && (
          <div className="flex gap-0.5">
            {!scope.primaryRegion ? (
              <span className="text-sm" title="Unknown Region">❓</span>
            ) : (
              supplement.status.map(st => {
                const emoji = st.split(' ')[0];
                return <span key={st} className="text-sm" title={st}>{emoji}</span>;
              })
            )}
          </div>
        )}
        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">Domain: {post.domain}</span>
        {supplement && (
          <Link to={`/supplement/${supplement.id}`} className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors border border-emerald-200 dark:border-emerald-500/20">
            {supplement.name}
          </Link>
        )}
        {brand && (
          <Link to={`/brand/${brand.id}`} className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors border border-blue-200 dark:border-blue-500/20">
            {brand.name}
          </Link>
        )}
        {stack && (
          <Link to={`/stack/${stack.id}`} className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors border border-purple-200 dark:border-purple-500/20">
            {stack.name}
          </Link>
        )}
      </div>

      {/* Title & Content */}
      <div className="block group/post">
        <Link to={`/post/${post.id}`}>
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">
            {post.title}
          </h3>
        </Link>
        {post.bearings && post.bearings.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.bearings.map(bearing => (
              <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                {bearing}
              </Link>
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400 line-clamp-3">
          {post.content}
        </p>
      </div>

      {/* Structured Log Details (The "Crafted" Indicators) */}
      {post.logDetails && (
        <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/50">
          {post.logDetails.duration && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <Clock size={14} className="text-blue-500 dark:text-blue-400" />
              <span>{post.logDetails.duration}</span>
            </div>
          )}
          {post.logDetails.dosage && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <Scale size={14} className="text-emerald-500 dark:text-emerald-400" />
              <span>{post.logDetails.dosage}</span>
            </div>
          )}
          {post.logDetails.brandMentioned && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <Droplet size={14} className="text-purple-500 dark:text-purple-400" />
              <span>{post.logDetails.brandMentioned}</span>
            </div>
          )}
          {post.logDetails.stackIncluded && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <Layers size={14} className="text-amber-500 dark:text-amber-400" />
              <span>Stack Info</span>
            </div>
          )}
          {post.logDetails.bloodworkIncluded && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <Activity size={14} className="text-red-500 dark:text-red-400" />
              <span>Bloodwork</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <CheckCircle size={16} />
            Helpful ({post.helpfulCount})
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <MessageSquare size={16} />
            Discuss ({post.comments})
          </button>
        </div>
        <div>
          <SaveButton id={post.id} type={post.type} />
        </div>
      </div>
      
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportReason('');
        }}
        title="Report Content"
      >
        <form onSubmit={handleReport} className="p-6 pt-4">
          <div className="mb-6 space-y-3">
            {['Spam', 'Misinformation', 'Harassment', 'Dangerous Content'].map((reason) => (
              <label
                key={reason}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  checked={reportReason === reason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  {reason}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowReportModal(false);
                setReportReason('');
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reportReason}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Report
            </button>
          </div>
        </form>
      </Modal>
    </div>
    </>
  );
}
