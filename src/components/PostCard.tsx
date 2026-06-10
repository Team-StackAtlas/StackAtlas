import { MessageSquare, Clock, Scale, ShieldCheck, Heart, Droplet, Layers, MoreHorizontal, Flag, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { BRANDS, STACKS, SUPPLEMENTS, type Post } from '../data/mockData';
import { cn } from '../lib/utils';
import { useState, useRef, useEffect } from 'react';
import { SaveButton } from './SaveButton';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase/client';
import { createReport, softDeletePost, toggleLike, type ReportReason } from '../services/community';

interface PostCardProps {
  post: Post;
}

const REPORT_REASONS: ReportReason[] = [
  'Spam',
  'Abuse / Harassment',
  'Dangerous Advice',
  'False or Misleading Information',
  'Off-topic',
  'Duplicate',
  'Other',
];

function ImageGrid({ images }: { images?: string[] }) {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  if (!images?.length) return null;
  const shown = images.slice(0, 4);
  return (
    <>
      <div className={cn('grid gap-1 overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800', shown.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {shown.map((image, index) => (
          <button key={image} type="button" onClick={() => setActiveImage(image)} className={cn('overflow-hidden bg-slate-100 dark:bg-zinc-800', shown.length === 3 && index === 0 ? 'row-span-2' : '')}>
            <img src={image} alt="Post attachment" className={cn('h-full w-full object-cover', shown.length === 1 ? 'max-h-96' : 'h-40')} />
          </button>
        ))}
      </div>
      <Modal isOpen={!!activeImage} onClose={() => setActiveImage(null)} title="Image preview">
        {activeImage && <img src={activeImage} alt="Post attachment" className="max-h-[80vh] w-full object-contain bg-black" />}
      </Modal>
    </>
  );
}

export default function PostCard({ post }: PostCardProps) {
  const entityType = post.entityType ?? (post.supplementId ? 'substance' : post.stackId ? 'stack' : post.brandId ? 'brand' : null);
  const entityId = post.entityId ?? post.supplementId ?? post.stackId ?? post.brandId ?? null;
  const supplement = SUPPLEMENTS.find((s) => s.id === post.supplementId);
  const brand = BRANDS.find((b) => b.id === post.brandId);
  const stack = STACKS.find((s) => s.id === post.stackId);
  const entityLabel = supplement?.name ?? brand?.name ?? stack?.name;
  const entityHref = entityType === 'substance' ? `/substance/${entityId}` : entityType === 'brand' ? `/brand/${entityId}` : entityType === 'stack' ? `/stack/${entityId}` : null;

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportNote, setReportNote] = useState('');
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post.helpfulCount ?? 0);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const requireAccount = useRequireAccountAction();
  const { user, isBackendConfigured } = useAuth();
  const postTargetType = post.type === 'Dispatch' ? 'dispatch' : 'signal';
  const ownPost = user?.id === post.author.id;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLike = async () => {
    if (!requireAccount()) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));
    if (isBackendConfigured && supabase) {
      try {
        await toggleLike(supabase, postTargetType, post.id, liked);
      } catch {
        setLiked(liked);
        setLikeCount((count) => count + (nextLiked ? -1 : 1));
        toast('Could not update Like.', 'error');
      }
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason || !requireAccount()) return;
    if (reportReason === 'Other' && reportNote.trim().length < 5) {
      toast('Other reports need a note of at least 5 characters.', 'error');
      return;
    }
    try {
      if (isBackendConfigured && supabase) await createReport(supabase, postTargetType, post.id, reportReason, reportNote);
      toast('Report submitted successfully.');
      setShowReportModal(false);
      setShowMenu(false);
      setReportReason('');
      setReportNote('');
    } catch {
      toast('Could not submit report.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!ownPost || !requireAccount()) return;
    if (isBackendConfigured && supabase) {
      try {
        await softDeletePost(supabase, post.id);
        toast('Post deleted.');
        setShowMenu(false);
      } catch {
        toast('Could not delete post.', 'error');
      }
    } else {
      toast('Demo posts cannot be deleted in prototype mode.', 'error');
    }
  };

  const bearings = post.bearings ?? [];
  const visibleBearings = bearings.slice(0, 3);
  const overflow = bearings.length - visibleBearings.length;

  return (
    <>
      <article className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.author.username}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-700 transition-opacity hover:opacity-80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {post.author.username.charAt(0).toUpperCase()}
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link>
                {post.author.isVerified && <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-500" />}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-500">
                {post.sharedAge ?? post.author.age ? <span>{post.sharedAge ?? post.author.age}y</span> : null}
                {post.sharedWeight ?? post.author.weight ? <span>• {post.sharedWeight ?? post.author.weight}</span> : null}
                <span>• {formatDistanceToNow(new Date(post.createdAt))} ago</span>
              </div>
            </div>
          </div>
          <div className="relative flex items-center gap-2" ref={menuRef}>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">{post.type}</span>
            <button onClick={() => setShowMenu(!showMenu)} className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Post menu">
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <button onClick={() => { if (requireAccount()) { setShowReportModal(true); setShowMenu(false); } }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-slate-50 dark:text-red-400 dark:hover:bg-zinc-800">
                  <Flag size={14} /> Report
                </button>
                {ownPost && (
                  <button onClick={handleDelete} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-slate-50 dark:text-red-400 dark:hover:bg-zinc-800">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {entityLabel && entityHref && (
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
            <Link to={entityHref} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-600 transition-colors hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
              {entityLabel}
            </Link>
            {stack && <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400">Whole stack Dispatch</span>}
          </div>
        )}

        <div className="block group/post">
          <Link to={`/post/${post.id}`}>
            <h3 className="mb-2 text-base font-bold text-slate-900 transition-colors hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-500">{post.title}</h3>
          </Link>
          {bearings.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {visibleBearings.map((bearing) => (
                <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                  {bearing}
                </Link>
              ))}
              {overflow > 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">+{overflow}</span>}
            </div>
          )}
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">{post.content}</p>
        </div>

        <ImageGrid images={post.images} />

        {post.logDetails && (
          <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800/50 dark:bg-zinc-950">
            {post.logDetails.duration && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300"><Clock size={14} className="text-blue-500" /><span>{post.logDetails.duration}</span></div>
            )}
            {post.logDetails.dosage && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300"><Scale size={14} className="text-emerald-500" /><span>{post.logDetails.dosage}</span></div>
            )}
            {post.logDetails.brandMentioned && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300"><Droplet size={14} className="text-purple-500" /><span>{post.logDetails.brandMentioned}</span></div>
            )}
            {post.logDetails.stackIncluded && (
              <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300"><Layers size={14} className="text-amber-500" /><span>Stack dosing</span></div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-zinc-800/50">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', liked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-emerald-600 dark:text-zinc-500 dark:hover:text-emerald-400')}>
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} /> Like ({likeCount})
            </button>
            <Link to={`/post/${post.id}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400">
              <MessageSquare size={16} /> Comments ({post.comments})
            </Link>
          </div>
          <SaveButton id={post.id} type={post.type.toLowerCase() as 'dispatch' | 'signal'} />
        </div>
      </article>

      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Report Content">
        <form onSubmit={handleReport} className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                <input type="radio" name="reportReason" value={reason} checked={reportReason === reason} onChange={() => setReportReason(reason)} className="text-red-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{reason}</span>
              </label>
            ))}
          </div>
          {reportReason === 'Other' && <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} rows={3} placeholder="Add a short note" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-red-500 focus:outline-none dark:border-zinc-700" />}
          <button type="submit" disabled={!reportReason} className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">Submit Report</button>
        </form>
      </Modal>
    </>
  );
}
