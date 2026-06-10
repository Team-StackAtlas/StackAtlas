import { useParams, Link } from 'react-router-dom';
import { getPosts } from '../data/mockData';
import { MessageSquare, ThumbsUp, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const post = getPosts().find(p => p.id === id);

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Post Not Found</h2>
        <p className="text-slate-500 dark:text-zinc-400 mb-6">The post you are looking for does not exist.</p>
        <Link to="/square" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
          Return to Square
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <Link to="/square" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Square
      </Link>
      
      <article className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-zinc-300">
            {post.author.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link to={`/profile/${post.author.username}`} className="font-semibold text-slate-900 dark:text-zinc-100 hover:underline">
                {post.author.username}
              </Link>
              {post.author.isVerified && (
                <ShieldCheck size={16} className="text-emerald-500" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span>{post.domain}</span>
              <span>•</span>
              <span>{post.category}</span>
            </div>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-zinc-100 mb-6 leading-tight">
          {post.title}
        </h1>

        {post.bearings && post.bearings.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.bearings.map(bearing => (
              <Link key={bearing} to={`/square?bearing=${encodeURIComponent(bearing)}`} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                {bearing}
              </Link>
            ))}
          </div>
        )}

        {post.structuredContent ? (
          <div className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">Dosages & Protocol</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                {post.structuredContent.dosages}
              </div>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">Effects</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                {post.structuredContent.effects}
              </div>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">Side Effects</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                {post.structuredContent.sideEffects}
              </div>
            </section>
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 mb-3 border-b border-slate-200 dark:border-zinc-800 pb-2">Personal Experience</h3>
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                {post.structuredContent.personalExperience}
              </div>
            </section>
          </div>
        ) : (
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-6">
          <button className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
            <ThumbsUp size={20} />
            <span>{post.helpfulCount} Helpful</span>
          </button>
          <button className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
            <MessageSquare size={20} />
            <span>{post.comments} Comments</span>
          </button>
        </div>
      </article>
    </div>
  );
}
