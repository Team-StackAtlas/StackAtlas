import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, ShieldCheck } from 'lucide-react';
import { getPosts, SUPPLEMENTS, BRANDS, STACKS, Post } from '../data/mockData';

function getLinkedEntity(post: Post) {
  const supplement = SUPPLEMENTS.find(s => s.id === post.supplementId);
  const brand = BRANDS.find(b => b.id === post.brandId);
  const stack = STACKS.find(s => s.id === post.stackId);
  if (post.dispatchProtocol && post.dispatchProtocol.entries.length > 1) {
    return { label: post.dispatchProtocol.entries.map(entry => entry.substanceName).join(' + '), href: `/post/${post.id}` };
  }
  if (supplement) return { label: supplement.name, href: `/substance/${supplement.id}` };
  if (brand) return { label: brand.name, href: `/brand/${brand.id}` };
  if (stack) return { label: stack.name, href: `/stack/${stack.id}` };
  return null;
}

function getDispatchRows(post: Post) {
  if (post.type !== 'Dispatch') return [];
  if (post.dispatchProtocol) {
    return post.dispatchProtocol.entries.map(entry => ({
      label: entry.substanceName,
      value: `${entry.dose} · ${entry.frequency} · ${post.dispatchProtocol?.duration}`,
    }));
  }
  const dose = post.logDetails?.dosage ?? post.structuredContent?.dosages;
  const frequency = post.structuredContent?.frequency;
  const duration = post.logDetails?.duration;
  const value = [dose, frequency, duration].filter(Boolean).join(' · ');
  return value ? [{ label: 'Protocol', value }] : [];
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const post = getPosts().find(p => p.id === id);

  if (!post) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-zinc-100">Post Not Found</h2>
        <p className="mb-6 text-slate-500 dark:text-zinc-400">The post you are looking for does not exist.</p>
        <Link to="/square" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">Return to Square</Link>
      </div>
    );
  }

  const linkedEntity = getLinkedEntity(post);
  const dispatchRows = getDispatchRows(post);
  const comments = post.commentItems ?? [];

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link to="/square" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <ArrowLeft size={16} />
        Back to Square
      </Link>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
              {post.author.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link>
                {post.author.isVerified && <ShieldCheck size={16} className="text-emerald-500" />}
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{post.type}</span>
        </div>

        {linkedEntity && (
          <Link to={linkedEntity.href} className="mb-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
            {linkedEntity.label}
          </Link>
        )}

        <h1 className="mb-5 text-3xl font-bold leading-tight text-slate-950 dark:text-zinc-50 md:text-4xl">{post.title}</h1>

        {post.bearings && post.bearings.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {post.bearings.map(bearing => (
              <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                {bearing}
              </Link>
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap text-lg leading-relaxed text-slate-700 dark:text-zinc-300">{post.content}</div>

        {dispatchRows.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Dispatch details</h2>
            <div className="space-y-2">
              {dispatchRows.map(row => (
                <div key={row.label} className="text-sm text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{row.label}:</span> {row.value}
                </div>
              ))}
              {post.dispatchProtocol?.clarification && (
                <p className="pt-2 text-sm text-slate-600 dark:text-zinc-400">{post.dispatchProtocol.clarification}</p>
              )}
            </div>
          </section>
        )}

        <div className="mt-8 flex items-center gap-6 border-t border-slate-200 pt-6 text-sm font-semibold text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
          <span className="inline-flex items-center gap-2" aria-label={`${post.helpfulCount} hearts`}><Heart size={20} />{post.helpfulCount}</span>
          <a href="#comments" className="inline-flex items-center gap-2 transition-colors hover:text-blue-600 dark:hover:text-blue-400" aria-label={`${post.comments} comments`}><MessageCircle size={20} />{post.comments}</a>
        </div>
      </article>

      <section id="comments" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-slate-950 dark:text-zinc-50">Comments</h2>
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.slice(0, 2).map(comment => (
              <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900 dark:text-zinc-100">{comment.author}</span>
                  <span className="text-xs text-slate-500 dark:text-zinc-500">{new Date(comment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">No comments yet.</p>
        )}
      </section>
    </div>
  );
}
