import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPosts, SOURCES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../hooks/useLibrary';
import type { AlbumItem, LibraryAlbum } from '../services/types';

function label(type: string) { return type === 'dispatch' ? 'Dispatch' : type === 'signal' ? 'Signal' : type === 'source' ? 'Source' : 'External Link'; }

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, services, isBackendConfigured } = useAuth();
  const { albums, albumItems, removeFromAlbum } = useLibrary();
  const [loadedAlbum, setLoadedAlbum] = useState<LibraryAlbum | null>(null);
  const [loadedItems, setLoadedItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(isBackendConfigured);

  useEffect(() => {
    let active = true;
    async function loadPublicAlbum() {
      if (!id || !services || !isBackendConfigured) return;
      setLoading(true);
      const album = await services.library.getAlbum(id);
      const items = album ? await services.library.listAlbumItems(id) : [];
      if (active) {
        setLoadedAlbum(album);
        setLoadedItems(items);
        setLoading(false);
      }
    }
    loadPublicAlbum().catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, isBackendConfigured, services]);

  const album = albums.find((candidate) => candidate.id === id) ?? loadedAlbum;
  const items = (albumItems.some((item) => item.albumId === id) ? albumItems : loadedItems).filter((item) => item.albumId === album?.id);
  if (loading) return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Loading album…</div>;
  if (!album) return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Album unavailable or private.</div>;
  const isOwner = user?.id === album.ownerId;
  if (album.privacy === 'private' && !isOwner) return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Album unavailable or private.</div>;
  return <div className="mx-auto max-w-3xl px-4 pb-24 pt-6"><Link to="/library" className="text-sm text-emerald-600 hover:underline">Back to Library</Link><div className="my-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase dark:bg-zinc-800">{album.privacy}</span><h1 className="mt-3 text-3xl font-black">{album.title}</h1>{album.description && <p className="mt-2 text-slate-600 dark:text-zinc-400">{album.description}</p>}<p className="mt-3 text-xs text-slate-500">By @{album.ownerUsername ?? 'owner'} · Created {new Date(album.createdAt).toLocaleString()} · Updated {new Date(album.updatedAt).toLocaleString()}</p></div><div className="space-y-3">{items.map((item) => { const post = getPosts().find((candidate) => candidate.id === item.savedItemId); const source = SOURCES.find((candidate) => candidate.id === item.savedItemId); const title = post?.title ?? source?.title ?? item.savedItemId; const href = post ? `/post/${post.id}` : source?.url; return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3"><div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">{label(item.savedItemType)}</span><h2 className="mt-2 font-bold">{title || `${label(item.savedItemType)} unavailable`}</h2>{href && <a href={href} className="text-sm text-emerald-600 hover:underline">Open</a>}</div>{isOwner && <button onClick={() => removeFromAlbum(item.id)} className="text-sm text-slate-500 hover:text-red-600">Remove</button>}</div></div>; })}{items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-zinc-800">No items in this album.</div>}</div></div>;
}
