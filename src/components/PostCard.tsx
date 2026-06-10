import { Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Post, SUPPLEMENTS, BRANDS, STACKS } from '../data/mockData';

export const POST_CARD_TITLE_MAX_CHARS = 100;
export const POST_CARD_BODY_PREVIEW_MAX_CHARS = 280;

interface PostCardProps {
  post: Post;
}

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

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/80">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/profile/${post.author.username}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-700 transition-opacity hover:opacity-80 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {post.author.username.charAt(0).toUpperCase()}
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link to={`/profile/${post.author.username}`} className="truncate font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link>
              {post.author.isVerified && <ShieldCheck size={14} className="shrink-0 text-emerald-600 dark:text-emerald-500" />}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-zinc-500">{[post.author.displayName, `${formatDistanceToNow(new Date(post.createdAt))} ago`, post.type].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
      </div>

      <Link to={`/post/${post.id}`} className="block">
        {linkedEntity && (
          <span className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {linkedEntity.typeLabel}: {linkedEntity.label}
          </span>
        )}
        <h3 className="mb-2 text-2xl font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-700 dark:text-zinc-50 dark:group-hover:text-emerald-400">
          {truncateText(post.title, POST_CARD_TITLE_MAX_CHARS)}
        </h3>
        <p className="text-lg leading-relaxed text-slate-700 dark:text-zinc-300">
          {truncateText(post.content, POST_CARD_BODY_PREVIEW_MAX_CHARS)}
        </p>
      </Link>

      {post.bearings && post.bearings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.bearings.map(bearing => (
            <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
              {bearing}
            </Link>
          ))}
        </div>
      )}

      {dispatchLine && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          {dispatchLine}
        </div>
      )}

      <div className="mt-4 flex items-center gap-5 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
        <span className="inline-flex items-center gap-1.5" aria-label={`${post.helpfulCount} hearts`}><Heart size={17} />{post.helpfulCount}</span>
        <Link to={`/post/${post.id}#comments`} className="inline-flex items-center gap-1.5 transition-colors hover:text-blue-600 dark:hover:text-blue-400" aria-label={`${post.comments} comments`}><MessageCircle size={17} />{post.comments}</Link>
      </div>
    </article>
  );
}
