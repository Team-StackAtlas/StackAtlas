import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FolderLock, Globe, Lock } from 'lucide-react';
import { SOURCES } from '../data/mockData';
import { EmptyState } from '../components/EmptyState';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../hooks/useLibrary';
import { useFollowing } from '../hooks/useFollowing';
import { useToast } from '../components/ui/ToastProvider';
import { ReportAction } from '../components/ReportAction';

function label(type: string) {
  return type === 'dispatch' ? 'Dispatch' : type === 'signal' ? 'Signal' : type === 'source' ? 'Source' : 'External Link';
}

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isBackendConfigured } = useAuth();
  const { albums, albumItems, removeFromAlbum, updateAlbum } = useLibrary();
  const { isFollowing, toggleFollow } = useFollowing();
  const { toast } = useToast();
  const { posts: allPosts } = usePosts();
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const album = albums.find((candidate) => candidate.id === id);

  const unavailable = (
    <div className="mx-auto max-w-3xl px-4 pt-16">
      <EmptyState
        icon={FolderLock}
        title="Album unavailable"
        description="This album doesn't exist, or it's private and belongs to someone else."
        action={{ label: 'Back to Library', to: '/library' }}
      />
    </div>
  );
  if (!album) return unavailable;
  // Mirror useLibrary's owner identity: without a backend the local library
  // user owns everything it creates, so the owner can still view/manage their
  // own albums in mock mode.
  const viewerId = user?.id ?? (!isBackendConfigured ? 'local-library-user' : undefined);
  const isOwner = viewerId != null && viewerId === album.ownerId;
  if (album.privacy === 'private' && !isOwner) return unavailable;
  const items = albumItems.filter((item) => item.albumId === album.id);
  const isPublic = album.privacy === 'public';

  const togglePrivacy = async () => {
    if (savingPrivacy) return;
    const next = isPublic ? 'private' : 'public';
    setSavingPrivacy(true);
    try {
      await updateAlbum(album.id, { title: album.title, description: album.description, privacy: next });
      toast(next === 'public' ? 'Album is now public.' : 'Album is now private.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update album privacy.', 'error');
    } finally {
      setSavingPrivacy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Link to="/library" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
        Back to Library
      </Link>

      <div className="my-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            {isPublic ? <Globe size={12} /> : <Lock size={12} />}
            {album.privacy}
          </span>
          {isOwner ? (
            <button
              onClick={togglePrivacy}
              disabled={savingPrivacy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {isPublic ? <Lock size={13} /> : <Globe size={13} />}
              {savingPrivacy ? 'Saving…' : isPublic ? 'Make private' : 'Make public'}
            </button>
          ) : (
            <ReportAction targetType="album" targetId={album.id} entityName={album.title} />
          )}
        </div>

        <h1 className="mt-3 text-3xl font-black">{album.title}</h1>
        {album.description && <p className="mt-2 text-slate-600 dark:text-zinc-400">{album.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-500">
          <span>
            By @{album.ownerUsername ?? 'owner'} · Created {new Date(album.createdAt).toLocaleString()} · Updated{' '}
            {new Date(album.updatedAt).toLocaleString()}
          </span>
          {isPublic && !isOwner && (
            <>
              <span>{isFollowing('album', album.id) ? 1 : 0} followers</span>
              <button
                onClick={() => toggleFollow('album', album.id)}
                className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                {isFollowing('album', album.id) ? 'Following' : 'Follow'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const post = allPosts.find((p) => p.id === item.savedItemId);
          const source = SOURCES.find((s) => s.id === item.savedItemId);
          const title = post?.title ?? source?.title ?? item.savedItemId;
          const href = post ? `/post/${post.id}` : source?.url;
          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex justify-between gap-3">
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">
                    {label(item.savedItemType)}
                  </span>
                  <h2 className="mt-2 font-bold">{title || `${label(item.savedItemType)} unavailable`}</h2>
                  {href && (
                    <a href={href} className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
                      Open
                    </a>
                  )}
                </div>
                {isOwner && (
                  <button onClick={() => removeFromAlbum(item.id)} className="text-sm text-slate-500 hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <EmptyState
            title="Nothing in this album yet"
            description={isOwner ? 'Save posts or sources, then add them to this album from the Library.' : 'The owner has not added anything yet.'}
          />
        )}
      </div>
    </div>
  );
}
