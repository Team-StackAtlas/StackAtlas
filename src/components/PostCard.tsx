import { useState } from 'react';
import { Check, Heart, MessageCircle, MoreHorizontal, ShieldCheck, Radio, FlaskConical, Beaker, Package, Layers, Share, type LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Post, SUPPLEMENTS, BRANDS, STACKS } from '../data/mockData';
import { SaveButton } from './SaveButton';
import { getSavedPostMetadata } from '../lib/savedPostMetadata';
import { getPostCommentCount } from '../lib/comments';
import { usePostLike } from '../hooks/usePostLike';
import { ReportAction } from './ReportAction';
import { cn } from '../lib/utils';

export const POST_CARD_TITLE_MAX_CHARS = 100;
export const POST_CARD_BODY_PREVIEW_MAX_CHARS = 280;

interface PostCardProps {
  post: Post;
}

const ENTITY_ICONS: Record<string, LucideIcon> = {
  Substance: Beaker,
  Brand: Package,
  Stack: Layers,
};

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}...`;
}

function getLinkedEntity(post: Post) {
  const supplement = SUPPLEMENTS.find(s => s.id === post.supplementId);
  const brand = BRANDS.find(b => b.id === post.brandId);
  const stack = STACKS.find(s => s.id === post.stackId);
  if (post.dispatchProtocol && post.dispatchProtocol.entries.length > 1) {
    return { label: post.dispatchProtocol.entries.map(entry => entry.substanceName).join(' + '), typeLabel: 'Substance', href: `/post/${post.id}` };
  }
  if (supplement) return { label: supplement.name, typeLabel: 'Substance', href: `/substance/${supplement.id}` };
  if (brand) return { label: brand.name, typeLabel: 'Brand', href: `/brand/${brand.id}` };
  if (stack) return { label: stack.name, typeLabel: 'Stack', href: `/stack/${stack.id}` };
  return null;
}

function getDispatchLine(post: Post) {
  if (post.type !== 'Dispatch') return null;
  if (post.dispatchProtocol) {
    const entries = post.dispatchProtocol.entries.map(entry => `${entry.substanceName}: ${entry.dose} · ${entry.frequency}`);
    return `${entries.join(' · ')} · ${post.dispatchProtocol.duration}`;
  }
  const dose = post.logDetails?.dosage ?? post.structuredContent?.dosages;
  const frequency = post.structuredContent?.frequency;
  const duration = post.logDetails?.duration;
  return [dose, frequency, duration].filter(Boolean).join(' · ') || null;
}

export default function PostCard({ post }: PostCardProps) {
  const linkedEntity = getLinkedEntity(post);
  const dispatchLine = getDispatchLine(post);
  const commentCount = getPostCommentCount(post);
  const { liked, count, toggleLike } = usePostLike(post.id, post.helpfulCount, post.author.id);
  const [copied, setCopied] = useState(false);

  const sharePost = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // User dismissed the share sheet or clipboard was unavailable — no-op.
    }
  };

  const isDispatch = post.type === 'Dispatch';
  const TypeIcon = isDispatch ? FlaskConical : Radio;
  const EntityIcon = linkedEntity ? ENTITY_ICONS[linkedEntity.typeLabel] : undefined;

  return (
    <article className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700 dark:hover:bg-zinc-900">
      <header className="mb-3.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/profile/${post.author.username}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition-opacity hover:opacity-80 dark:from-zinc-800 dark:to-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700">
            {post.author.username.charAt(0).toUpperCase()}
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${post.author.username}`} className="truncate text-sm font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link>
              {post.author.isVerified && <ShieldCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-500" />}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-500">{[post.author.displayName, `${formatDistanceToNow(new Date(post.createdAt))} ago`].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SaveButton id={post.id} type={post.type} metadata={getSavedPostMetadata(post)} />
          <div className="group/actions relative">
            <button type="button" aria-label="Post actions" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"><MoreHorizontal size={16} /></button>
            <div className="invisible absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition group-hover/actions:visible group-hover/actions:opacity-100 dark:border-zinc-800 dark:bg-zinc-900"><ReportAction targetType="post" targetId={post.id} entityName={post.title} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-500/10 dark:hover:text-red-300" /></div>
          </div>
        </div>
      </header>

      <Link to={`/post/${post.id}`} className="block">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            isDispatch
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300',
          )}>
            <TypeIcon size={12} />
            {post.type}
          </span>
          {linkedEntity && (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {EntityIcon && <EntityIcon size={12} className="shrink-0 text-slate-400 dark:text-zinc-500" />}
              <span className="truncate">{linkedEntity.label}</span>
            </span>
          )}
        </div>
        <h3 className="mb-1.5 text-lg font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400 md:text-xl">
          {truncateText(post.title, POST_CARD_TITLE_MAX_CHARS)}
        </h3>
        <p className="text-[15px] leading-relaxed text-slate-600 dark:text-zinc-400">
          {truncateText(post.content, POST_CARD_BODY_PREVIEW_MAX_CHARS)}
        </p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" loading="lazy" className="mt-3 max-h-96 w-full rounded-xl border border-slate-200 object-cover dark:border-zinc-800" />
        )}
      </Link>

      {dispatchLine && (
        <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
          <FlaskConical size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <span className="min-w-0 font-medium leading-relaxed">{dispatchLine}</span>
        </div>
      )}

      {post.bearings && post.bearings.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {post.bearings.map(bearing => (
            <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200">
              {bearing}
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-500 dark:border-zinc-800/80 dark:text-zinc-500">
        <button type="button" onClick={toggleLike} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label={`${count} hearts`}>
          <Heart size={16} className={liked ? 'fill-current text-rose-600' : undefined} />{count}
        </button>
        <Link to={`/post/${post.id}#comments`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400" aria-label={`${commentCount} comments`}>
          <MessageCircle size={16} />{commentCount}
        </Link>
        <button type="button" onClick={() => void sharePost()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400" aria-label="Share post">
          {copied ? <><Check size={16} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Copied</span></> : <Share size={16} />}
        </button>
      </footer>
    </article>
  );
}
