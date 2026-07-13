import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Folder, Search, Trash2 } from 'lucide-react';
import { SOURCES } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { useSaved, type SavedItem as HookSavedItem } from '../hooks/useSaved';
import { useLibrary } from '../hooks/useLibrary';
import type { SavedItem, SavedItemType } from '../services/types';

type Filter = 'all' | 'dispatch' | 'signal' | 'source' | 'album';

function normalizeSavedType(type: string, postType?: string): SavedItemType {
  if (type === 'Dispatch' || type === 'dispatch') return 'dispatch';
  if (type === 'Signal' || type === 'signal') return 'signal';
  if (type === 'source') return 'source';
  if (type === 'external_link') return 'external_link';
  if (type === 'post' && postType === 'Dispatch') return 'dispatch';
  if (type === 'post' && postType === 'Signal') return 'signal';
  return type as SavedItemType;
}

function label(type: string) {
  return type === 'dispatch' ? 'Dispatch' : type === 'signal' ? 'Signal' : type === 'source' || type === 'external_link' ? 'Source' : 'Album';
}

export default function Library() {
  const { status } = useAuth();
  const { savedItems, unsaveItem } = useSaved();
  const { posts: allPosts } = usePosts();
  const { albums, albumItems, createAlbum, deleteAlbum, addToAlbum, removeFromAlbum } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [query, setQuery] = useState('');

  const resolved = savedItems.map((item) => {
    const post = allPosts.find((p) => p.id === item.id);
    const source = SOURCES.find((s) => s.id === item.id);
    const type = normalizeSavedType(item.type, post?.type);
    return { ...item, type, title: item.title ?? post?.title ?? source?.title, description: item.description ?? post?.content, url: item.url ?? source?.url, siteName: item.siteName ?? source?.publisher, author: item.siteName ?? post?.author.displayName ?? post?.author.username, originalCreatedAt: item.originalCreatedAt ?? post?.createdAt, unavailable: (type === 'dispatch' || type === 'signal') && !post };
  });

  const rows = useMemo(() => {
    const albumRows = albums.map((album) => ({ ...album, type: 'album' as const, savedAt: album.updatedAt }));
    return [...resolved, ...albumRows]
      .filter((item) => filter === 'all' || item.type === filter || (filter === 'source' && item.type === 'external_link'))
      .filter((item) => `${'title' in item ? item.title : ''} ${'description' in item ? item.description ?? '' : ''} ${'siteName' in item ? item.siteName ?? '' : ''} ${'relatedName' in item ? item.relatedName ?? '' : ''}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sort === 'newest' ? new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime() : new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
  }, [albums, filter, query, resolved, sort]);

  async function submitAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    await createAlbum({ title, description: String(form.get('description') ?? '').trim() || undefined, privacy: form.get('privacy') === 'public' ? 'public' : 'private' });
    event.currentTarget.reset();
  }


  if (status !== 'authenticated' && status !== 'unconfigured') {
    return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Sign in to view your private Library.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between gap-3"><div><h1 className="text-3xl font-black">Library</h1><p className="text-sm text-slate-500">Private saved posts, sources, links, and albums.</p></div></div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Library" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 dark:border-zinc-800 dark:bg-zinc-900" /></label>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">{(['all','dispatch','signal','source','album'] as Filter[]).map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === tab ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>{tab === 'all' ? 'All saved' : label(tab)}</button>)}</div>
      <div className="mb-6 grid gap-4">
        <form onSubmit={submitAlbum} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 flex items-center gap-2 font-bold"><Folder size={16}/> Create album</h2><input name="title" required placeholder="Album title" className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"/><textarea name="description" placeholder="Optional description" className="mb-2 h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"/><select name="privacy" defaultValue="private" className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"><option value="private">Private</option><option value="public">Public</option></select><button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">Create album</button></form>
      </div>
      <div className="space-y-3">{rows.map((item) => 'ownerId' in item ? <div key={`album-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3"><div><Link to={`/library/albums/${item.id}`} className="font-bold hover:underline">{item.title}</Link><p className="text-sm text-slate-500">{item.privacy} · {item.description}</p></div><button onClick={() => deleteAlbum(item.id)}><Trash2 size={16}/></button></div></div> : <SavedRow key={`${item.type}-${item.id}`} item={item} albums={albums} albumItems={albumItems} onUnsave={() => unsaveItem(item.id, item.type)} onAdd={addToAlbum} onRemove={removeFromAlbum} />)}{rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-zinc-800">No Library items match.</div>}</div>
    </div>
  );
}

function SavedRow({ item, albums, albumItems, onUnsave, onAdd, onRemove }: { item: HookSavedItem & { unavailable?: boolean }; albums: { id: string; title: string }[]; albumItems: { id: string; albumId: string; savedItemType: SavedItemType; savedItemId: string }[]; onUnsave: () => void; onAdd: (albumId: string, item: SavedItem) => void | Promise<void>; onRemove: (albumItemId: string) => void }) {
  const type = item.type.toLowerCase() as SavedItemType;
  const linked = type === 'dispatch' || type === 'signal' ? `/post/${item.id}` : item.url;
  const current = albumItems.filter((albumItem) => albumItem.savedItemType === type && albumItem.savedItemId === item.id);
  const content = <><span className="mb-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">{label(type)}</span><h3 className="font-bold">{item.unavailable ? 'Post unavailable' : item.title ?? item.id}</h3>{item.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>}{item.relatedName && !item.unavailable && <p className="mt-1 text-xs text-slate-500">Related: {item.relatedName}</p>}{item.siteName && !item.unavailable && <p className="mt-1 text-xs text-slate-500">Author/source: {item.siteName}</p>}{item.originalCreatedAt && !item.unavailable && <p className="mt-1 text-xs text-slate-500">Posted: {new Date(item.originalCreatedAt).toLocaleString()}</p>}<p className="mt-1 text-xs text-slate-500">Saved: {new Date(item.savedAt).toLocaleString()}</p></>;
  const body = linked && !item.unavailable && (type === 'dispatch' || type === 'signal') ? <Link to={linked} className="block flex-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40">{content}</Link> : <div className="flex-1">{content}{linked && !item.unavailable && <a href={linked} className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"><ExternalLink size={14}/> Source</a>}</div>;
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3">{body}<button onClick={onUnsave} title="Unsave"><Bookmark className="fill-current text-emerald-500" size={18}/></button></div><div className="mt-3 flex flex-wrap items-center gap-2"><select onChange={(e) => e.target.value && onAdd(e.target.value, { itemId: item.id, itemType: type, title: item.title, url: item.url, description: item.description })} defaultValue="" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950"><option value="">Add to album…</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select>{current.map((albumItem) => <button key={albumItem.id} onClick={() => onRemove(albumItem.id)} className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-zinc-800">Remove from {albums.find((a) => a.id === albumItem.albumId)?.title ?? 'album'}</button>)}</div></div>;
}
