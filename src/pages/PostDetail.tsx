import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Reply, ShieldCheck, Trash2 } from 'lucide-react';
import { SUPPLEMENTS, BRANDS, STACKS, Post, USERS } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import { SaveButton } from '../components/SaveButton';
import { useAuth } from '../context/AuthContext';
import { getSavedPostMetadata } from '../lib/savedPostMetadata';
import { countVisibleComments, type CommentNode } from '../lib/comments';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import { useFollowing } from '../hooks/useFollowing';
import { usePostLike } from '../hooks/usePostLike';
import { ReportAction } from '../components/ReportAction';
import { supabase, isBackendConfigured } from '../services/supabase/client';
import {
  createSupabaseComment,
  loadSupabaseComments,
  softDeleteSupabaseComment,
  toggleSupabaseCommentVote,
} from '../services/posts';

/** Full-screen viewer for an attached post photo; click anywhere or Esc closes. */
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-label="Image viewer"
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
    >
      <img src={url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
    </div>
  );
}

function getLinkedEntity(post: Post) {
  const supplement = SUPPLEMENTS.find(s => s.id === post.supplementId);
  const brand = BRANDS.find(b => b.id === post.brandId);
  const stack = STACKS.find(s => s.id === post.stackId);
  if (post.dispatchProtocol && post.dispatchProtocol.entries.length > 1) {
    return { label: post.dispatchProtocol.entries.map(entry => entry.substanceName).join(' + '), href: `/post/${post.id}`, targetType: undefined, targetId: undefined };
  }
  if (supplement) return { label: supplement.name, href: `/substance/${supplement.id}`, targetType: 'substance' as const, targetId: supplement.id };
  if (brand) return { label: brand.name, href: `/brand/${brand.id}`, targetType: 'brand' as const, targetId: brand.id };
  if (stack) return { label: stack.name, href: `/stack/${stack.id}`, targetType: 'stack' as const, targetId: stack.id };
  return null;
}


function readCommentOverrides(postId: string): CommentNode[] | null {
  try {
    const stored = localStorage.getItem(`stackatlas_comments_${postId}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCommentOverrides(postId: string, comments: CommentNode[]) {
  localStorage.setItem(`stackatlas_comments_${postId}`, JSON.stringify(comments));
}

function updateCommentTree(comments: CommentNode[], id: string, update: (comment: CommentNode) => CommentNode | null): CommentNode[] {
  return comments.flatMap(comment => {
    if (comment.id === id) {
      const next = update(comment);
      return next ? [next] : [];
    }
    return [{ ...comment, replies: updateCommentTree(comment.replies ?? [], id, update) }];
  });
}

function findCommentInTree(comments: CommentNode[], id: string): CommentNode | undefined {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const nested = findCommentInTree(comment.replies ?? [], id);
    if (nested) return nested;
  }
  return undefined;
}

function addReplyToTree(comments: CommentNode[], parentId: string, reply: CommentNode): CommentNode[] {
  return comments.map(comment => {
    if (comment.id === parentId) return { ...comment, replies: [...(comment.replies ?? []), reply] };
    return { ...comment, replies: addReplyToTree(comment.replies ?? [], parentId, reply) };
  });
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
  const { user, profile, services } = useAuth();
  const navigate = useNavigate();
  const isSiteAdmin = profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
  const requireAccount = useRequireAccountAction();
  const { isFollowing, toggleFollow } = useFollowing();
  const { id } = useParams<{ id: string }>();
  const { posts } = usePosts();
  const post = posts.find(p => p.id === id);

  const postLike = usePostLike(post?.id ?? '', post?.helpfulCount ?? 0, post?.author.id);
  const [comments, setComments] = useState<CommentNode[]>(() => (post ? readCommentOverrides(post.id) ?? ((post.commentItems ?? []) as CommentNode[]) : []));
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentError, setCommentError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Supabase-backed posts persist their discussion; seed/local posts keep the
  // original localStorage behavior.
  const usesBackendComments = !!(post?.persisted && isBackendConfigured && supabase);

  const reloadBackendComments = async () => {
    if (!usesBackendComments || !post || !supabase) return;
    try {
      setComments(await loadSupabaseComments(supabase, post.id, user?.id));
    } catch (err) {
      console.error('Load comments failed', err);
      setCommentError(err instanceof Error ? err.message : 'Failed to load comments.');
    }
  };

  useEffect(() => {
    if (!usesBackendComments) return;
    void reloadBackendComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesBackendComments, post?.id, user?.id]);

  const discussionCount = useMemo(() => countVisibleComments(comments), [comments]);

  const persistComments = (next: CommentNode[]) => {
    setComments(next);
    if (post) writeCommentOverrides(post.id, next);
  };

  function addComment(event: FormEvent<HTMLFormElement>, parentId?: string) {
    event.preventDefault();
    if (!requireAccount()) return;
    const form = new FormData(event.currentTarget);
    const content = String(form.get('content') ?? '').trim();
    if (!content) return;
    setCommentError('');
    if (usesBackendComments && post && supabase) {
      const formElement = event.currentTarget;
      createSupabaseComment(supabase, { postId: post.id, parentId, body: content })
        .then(() => {
          formElement.reset();
          setReplyingTo(null);
          return reloadBackendComments();
        })
        .catch((err) => {
          console.error('Create comment failed', err);
          setCommentError(err instanceof Error ? err.message : 'Failed to post the comment.');
        });
      return;
    }
    const comment: CommentNode = { id: crypto.randomUUID(), author: user?.username ?? 'member', content, createdAt: new Date().toISOString(), likes: 0, likedBy: [], replies: [] };
    persistComments(parentId ? addReplyToTree(comments, parentId, comment) : [...comments, comment]);
    event.currentTarget.reset();
    setReplyingTo(null);
  }

  function toggleCommentLike(commentId: string) {
    if (!requireAccount()) return;
    const userId = user?.id ?? 'local-user';
    const nextTree = updateCommentTree(comments, commentId, comment => {
      const likedBy = comment.likedBy ?? [];
      const liked = likedBy.includes(userId);
      return { ...comment, likedBy: liked ? likedBy.filter(id => id !== userId) : [...likedBy, userId], likes: Math.max(0, (comment.likes ?? likedBy.length) + (liked ? -1 : 1)) };
    });
    if (usesBackendComments && supabase && user) {
      const wasLiked = (findCommentInTree(comments, commentId)?.likedBy ?? []).includes(userId);
      setComments(nextTree);
      toggleSupabaseCommentVote(supabase, commentId, user.id, !wasLiked).catch((err) => {
        console.error('Comment vote failed', err);
        void reloadBackendComments();
      });
      return;
    }
    persistComments(nextTree);
  }

  function deleteComment(commentId: string) {
    if (!post) return;
    if (usesBackendComments && supabase) {
      softDeleteSupabaseComment(supabase, commentId)
        .then(() => reloadBackendComments())
        .catch((err) => {
          console.error('Delete comment failed', err);
          setCommentError(err instanceof Error ? err.message : 'Only your own comments can be deleted.');
        });
      return;
    }
    persistComments(updateCommentTree(comments, commentId, comment => (comment.replies?.length ? { ...comment, deleted: true, content: 'Comment deleted' } : null)));
  }

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

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link to="/square" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        <ArrowLeft size={16} />
        Back to Square
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <article className="p-6 md:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                post.author.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link><button onClick={() => toggleFollow('user', post.author.id)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200">{isFollowing('user', post.author.id) ? 'Following' : 'Follow'}</button>
                {post.author.isVerified && <ShieldCheck size={16} className="text-emerald-500" />}
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2"><span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{post.type}</span><SaveButton id={post.id} type={post.type} metadata={getSavedPostMetadata(post)} /><ReportAction targetType="post" targetId={post.id} entityName={post.title} />{isSiteAdmin && post.persisted && services && (
            <button
              onClick={async () => {
                try {
                  await services.moderation.moderatePost(post.id, 'soft_delete');
                  navigate('/square');
                } catch (err) {
                  console.error('Remove post failed', err);
                  setCommentError(err instanceof Error ? err.message : 'Remove failed.');
                }
              }}
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-300"
              title="Soft-delete this post (restorable from Admin → Deleted)"
            >
              <Trash2 size={12} /> Remove
            </button>
          )}</div>
        </div>

        {linkedEntity && (
          <div className="mb-5 flex flex-wrap items-center gap-2"><Link to={linkedEntity.href} className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
            {linkedEntity.label}
          </Link>{linkedEntity.targetType && <button onClick={() => toggleFollow(linkedEntity.targetType, linkedEntity.targetId)} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-200">{isFollowing(linkedEntity.targetType, linkedEntity.targetId) ? 'Following' : 'Follow'}</button>}</div>
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
        {post.imageUrl && (
          <button type="button" onClick={() => setLightboxOpen(true)} aria-label="View image full screen" className="mt-4 block w-full cursor-zoom-in">
            <img src={post.imageUrl} alt="" className="max-h-[32rem] w-full rounded-2xl border border-slate-200 object-contain dark:border-zinc-800" />
          </button>
        )}
        {lightboxOpen && post.imageUrl && <ImageLightbox url={post.imageUrl} onClose={() => setLightboxOpen(false)} />}

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
          <LikeCount postAuthorId={post.author.id} currentUserId={user?.id ?? null} count={postLike.count} liked={postLike.liked} onToggle={postLike.toggleLike} />
          <a href="#comments" className="inline-flex items-center gap-2 transition-colors hover:text-blue-600 dark:hover:text-blue-400" aria-label={`${discussionCount} comments`}><MessageCircle size={20} />{discussionCount}</a>
        </div>
      </article>

      <section id="comments" className="border-t border-slate-200 p-6 dark:border-zinc-800 md:p-8">
        <h2 className="mb-4 text-xl font-bold text-slate-950 dark:text-zinc-50">Comments ({discussionCount})</h2>
        {commentError && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{commentError}</p>}
        <form onSubmit={addComment} className="mb-5 flex gap-2">
          <input name="content" placeholder="Add a comment" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">Post</button>
        </form>
        {comments.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800">
            {comments.map(comment => <CommentThread key={comment.id} postId={post.id} comment={comment} depth={0} currentUserId={user?.id ?? null} replyingTo={replyingTo} onReply={setReplyingTo} onSubmitReply={addComment} onLike={toggleCommentLike} onDelete={deleteComment} />)}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">No comments yet.</p>
        )}
      </section>
      </div>
    </div>
  );
}



function CommentThread({ postId, comment, depth, currentUserId, replyingTo, onReply, onSubmitReply, onLike, onDelete }: { postId: string; comment: CommentNode; depth: number; currentUserId: string | null; replyingTo: string | null; onReply: (id: string | null) => void; onSubmitReply: (event: FormEvent<HTMLFormElement>, parentId?: string) => void; onLike: (id: string) => void; onDelete: (id: string) => void }) {
  const liked = !!currentUserId && (comment.likedBy ?? []).includes(currentUserId);
  const visibleSelf = !comment.deleted || countVisibleComments(comment.replies ?? []) > 0;
  if (!visibleSelf) return null;
  return (
    <div className="py-3" style={{ marginLeft: `${Math.min(depth, 4) * 18}px` }}>
      <div className="border-l border-slate-200 pl-3 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm"><span className="font-semibold text-slate-900 dark:text-zinc-100">@{comment.author}</span><span className="text-xs text-slate-500 dark:text-zinc-500">{new Date(comment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          {!comment.deleted && <div className="flex items-center gap-1"><ReportAction targetType={depth === 0 ? 'comment' : 'reply'} targetId={`${postId}:${comment.id}`} entityName={comment.content.slice(0, 60) || 'comment'} />{currentUserId && <button onClick={() => onDelete(comment.id)} className="rounded-full p-1 text-slate-400 hover:text-red-600" aria-label="Delete comment"><Trash2 size={14}/></button>}</div>}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">{comment.content}</p>
        {!comment.deleted && <div className="mt-2 flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-zinc-400"><button onClick={() => onLike(comment.id)} className="inline-flex items-center gap-1 hover:text-rose-600"><Heart size={15} className={liked ? 'fill-current text-rose-600' : ''}/>{comment.likes ?? comment.likedBy?.length ?? 0}</button><button onClick={() => onReply(replyingTo === comment.id ? null : comment.id)} className="inline-flex items-center gap-1 hover:text-blue-600"><Reply size={15}/> Reply</button></div>}
        {replyingTo === comment.id && <form onSubmit={(event) => onSubmitReply(event, comment.id)} className="mt-3 flex gap-2"><input name="content" placeholder="Write a reply" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" /><button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white">Reply</button></form>}
        {(comment.replies ?? []).map(reply => <CommentThread key={reply.id} postId={postId} comment={reply} depth={depth + 1} currentUserId={currentUserId} replyingTo={replyingTo} onReply={onReply} onSubmitReply={onSubmitReply} onLike={onLike} onDelete={onDelete} />)}
      </div>
    </div>
  );
}

function LikeCount({ postAuthorId, currentUserId, count, liked, onToggle }: { postAuthorId: string; currentUserId: string | null; count: number; liked: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const isAuthor = currentUserId === postAuthorId;
  const likers = USERS.slice(0, Math.min(5, count)).map((u) => u.username);
  if (!isAuthor) return <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 transition-colors hover:text-rose-600" aria-label={`${count} hearts`}><Heart size={20} className={liked ? 'fill-current text-rose-600' : undefined} />{count}</button>;
  return (
    <span className="relative inline-flex items-center gap-2">
      <button onClick={onToggle} className="inline-flex items-center gap-2 transition-colors hover:text-rose-600" aria-label={`${count} hearts`}><Heart size={20} className={liked ? 'fill-current text-rose-600' : undefined} />{count}</button><button type="button" onClick={() => setOpen((value) => !value)} className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200">View</button>
      {open && <span className="absolute left-0 top-8 z-10 w-48 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900"><strong className="mb-2 block text-slate-900 dark:text-zinc-100">Liked by</strong>{likers.map((name) => <span key={name} className="block py-0.5">@{name}</span>)}</span>}
    </span>
  );
}
