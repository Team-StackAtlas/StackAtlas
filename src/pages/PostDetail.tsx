import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_COMMENTS, getPosts, type MockComment, type MockReply, type Post } from '../data/mockData';
import { MessageSquare, Heart, Clock, ShieldCheck, ArrowLeft, Flag, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase/client';
import { createComment, createReport, getCommunityPost, listComments, softDeleteComment, toggleLike, type ReportReason } from '../services/community';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import { useToast } from '../components/ui/ToastProvider';
import { Modal } from '../components/ui/Modal';

const REPORT_REASONS: ReportReason[] = ['Spam', 'Abuse / Harassment', 'Dangerous Advice', 'False or Misleading Information', 'Off-topic', 'Duplicate', 'Other'];

function MiniActions({ targetType, targetId, initialLikes, likedByMe, onReport, onDelete, canDelete }: { targetType: 'comment' | 'reply'; targetId: string; initialLikes: number; likedByMe?: boolean; onReport: () => void; onDelete?: () => void; canDelete?: boolean }) {
  const { isBackendConfigured } = useAuth();
  const requireAccount = useRequireAccountAction();
  const { toast } = useToast();
  const [liked, setLiked] = useState(!!likedByMe);
  const [count, setCount] = useState(initialLikes);
  const like = async () => {
    if (!requireAccount()) return;
    const next = !liked;
    setLiked(next);
    setCount((value) => value + (next ? 1 : -1));
    if (isBackendConfigured && supabase) {
      try { await toggleLike(supabase, targetType, targetId, liked); } catch { setLiked(liked); setCount((value) => value + (next ? -1 : 1)); toast('Could not update Like.', 'error'); }
    }
  };
  return <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-zinc-500"><button onClick={like} className="flex items-center gap-1 hover:text-emerald-600"><Heart size={14} fill={liked ? 'currentColor' : 'none'} /> Like ({count})</button><button onClick={onReport} className="flex items-center gap-1 hover:text-red-600"><Flag size={14} /> Report</button>{canDelete && <button onClick={onDelete} className="flex items-center gap-1 hover:text-red-600"><Trash2 size={14} /> Delete</button>}</div>;
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isBackendConfigured } = useAuth();
  const requireAccount = useRequireAccountAction();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<MockComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reportTarget, setReportTarget] = useState<{ type: 'dispatch' | 'signal' | 'comment' | 'reply'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportNote, setReportNote] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const reload = async () => {
    if (!id) return;
    if (isBackendConfigured && supabase) {
      const loaded = await getCommunityPost(supabase, id, user?.id);
      setPost(loaded);
      setLiked(!!loaded?.likedByMe);
      setLikeCount(loaded?.likeCount ?? loaded?.helpfulCount ?? 0);
      setComments(loaded ? await listComments(supabase, id, user?.id) : []);
    } else {
      const fallback = getPosts().find((p) => p.id === id) ?? null;
      setPost(fallback);
      setLikeCount(fallback?.helpfulCount ?? 0);
      setComments(MOCK_COMMENTS[id] ?? []);
    }
  };

  useEffect(() => { reload().catch(() => toast('Failed to load post.', 'error')); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, isBackendConfigured, user?.id]);

  if (!post) return <div className="flex h-64 flex-col items-center justify-center text-center"><h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-zinc-100">Post Not Found</h2><Link to="/square" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">Return to Square</Link></div>;

  const targetType = post.type === 'Dispatch' ? 'dispatch' : 'signal';

  const submitComment = async (parentId?: string) => {
    if (!requireAccount() || !id) return;
    const body = parentId ? replyBodies[parentId] : commentBody;
    if (!body?.trim()) return;
    try {
      if (isBackendConfigured && supabase) await createComment(supabase, id, body.trim(), parentId);
      else toast('Prototype comments are read-only until Supabase is configured.', 'error');
      setCommentBody('');
      setReplyBodies((prev) => ({ ...prev, [parentId ?? '']: '' }));
      await reload();
    } catch { toast('Could not submit comment.', 'error'); }
  };

  const likePost = async () => {
    if (!requireAccount()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((value) => value + (next ? 1 : -1));
    if (isBackendConfigured && supabase) {
      try { await toggleLike(supabase, targetType, post.id, liked); } catch { setLiked(liked); setLikeCount((value) => value + (next ? -1 : 1)); toast('Could not update Like.', 'error'); }
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || !reportReason || !requireAccount()) return;
    if (reportReason === 'Other' && reportNote.trim().length < 5) return toast('Other reports need a note of at least 5 characters.', 'error');
    try {
      if (isBackendConfigured && supabase) await createReport(supabase, reportTarget.type, reportTarget.id, reportReason, reportNote);
      toast('Report submitted successfully.');
      setReportTarget(null); setReportReason(''); setReportNote('');
    } catch { toast('Could not submit report.', 'error'); }
  };

  const deleteComment = async (commentId: string) => {
    if (!requireAccount()) return;
    try { if (isBackendConfigured && supabase) await softDeleteComment(supabase, commentId); await reload(); } catch { toast('Could not delete comment.', 'error'); }
  };

  const renderComment = (comment: MockComment) => (
    <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{comment.author.username}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-zinc-300">{comment.content}</p>
      <MiniActions targetType="comment" targetId={comment.id} initialLikes={comment.likeCount} likedByMe={(comment as any).likedByMe} onReport={() => setReportTarget({ type: 'comment', id: comment.id })} canDelete={user?.id === comment.author.id} onDelete={() => deleteComment(comment.id)} />
      {comment.replies.length > 0 && <button onClick={() => setExpanded((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))} className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">{expanded[comment.id] ? 'Hide' : 'View'} {comment.replies.length} replies</button>}
      {expanded[comment.id] && <div className="mt-3 space-y-3 border-l border-slate-200 pl-4 dark:border-zinc-800">{comment.replies.map((reply: MockReply) => <div key={reply.id}><div className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{reply.author.username}</div><p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">{reply.content}</p><MiniActions targetType="reply" targetId={reply.id} initialLikes={reply.likeCount} likedByMe={(reply as any).likedByMe} onReport={() => setReportTarget({ type: 'reply', id: reply.id })} canDelete={user?.id === reply.author.id} onDelete={() => deleteComment(reply.id)} /></div>)}</div>}
      <div className="mt-3 flex gap-2"><input value={replyBodies[comment.id] ?? ''} onChange={(e) => setReplyBodies({ ...replyBodies, [comment.id]: e.target.value })} placeholder="Write a reply" className="flex-1 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><button onClick={() => submitComment(comment.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">Reply</button></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link to="/square" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"><ArrowLeft size={16} />Back to Square</Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        <div className="mb-6 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{post.author.username.charAt(0).toUpperCase()}</div><div><div className="flex items-center gap-2"><Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 hover:underline dark:text-zinc-100">{post.author.username}</Link>{post.author.isVerified && <ShieldCheck size={16} className="text-emerald-500" />}</div><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400"><Clock size={14} />{new Date(post.createdAt).toLocaleDateString()}</div></div></div>
        <h1 className="mb-4 text-2xl font-bold leading-tight text-slate-900 dark:text-zinc-100 md:text-3xl">{post.title}</h1>
        <div className="mb-6 flex flex-wrap gap-2">{post.bearings?.map((bearing) => <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{bearing}</Link>)}</div>
        <div className="whitespace-pre-wrap text-slate-700 dark:text-zinc-300">{post.content}</div>
        {post.logDetails && <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"><div>{post.logDetails.dosage}</div><div>{post.logDetails.duration}</div></div>}
        {!!post.sideEffects?.length && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950"><span className="font-semibold">Side effects:</span> {post.sideEffects.join(', ')}</div>}
        {post.images?.length ? <div className="mt-6 grid grid-cols-2 gap-2">{post.images.map((image) => <img key={image} src={image} alt="Post attachment" className="max-h-80 w-full rounded-xl object-cover" />)}</div> : null}
        <div className="mt-8 flex items-center gap-6 border-t border-slate-200 pt-6 dark:border-zinc-800"><button onClick={likePost} className="flex items-center gap-2 font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"><Heart size={20} fill={liked ? 'currentColor' : 'none'} /><span>{likeCount} Like{likeCount === 1 ? '' : 's'}</span></button><button onClick={() => setReportTarget({ type: targetType, id: post.id })} className="flex items-center gap-2 font-medium text-slate-500 transition-colors hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"><Flag size={20} /><span>Report</span></button><div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400"><MessageSquare size={20} /><span>{comments.length} Comments</span></div></div>
      </article>
      <section className="mt-6 space-y-4"><h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Comments</h2><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50"><textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment" rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><button onClick={() => submitComment()} className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">Comment</button></div>{comments.map(renderComment)}</section>
      <Modal isOpen={!!reportTarget} onClose={() => setReportTarget(null)} title="Report Content"><form onSubmit={submitReport} className="space-y-4 p-6 pt-4">{REPORT_REASONS.map((reason) => <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800"><input type="radio" checked={reportReason === reason} onChange={() => setReportReason(reason)} />{reason}</label>)}{reportReason === 'Other' && <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-transparent p-3 dark:border-zinc-700" />}<button className="w-full rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white">Submit Report</button></form></Modal>
    </div>
  );
}
