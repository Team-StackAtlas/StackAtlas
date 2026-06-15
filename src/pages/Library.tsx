import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Folder, Search, Trash2 } from 'lucide-react';
import { BRANDS, getPosts, SOURCES, STACKS, SUPPLEMENTS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useSaved, type SavedItem as HookSavedItem } from '../hooks/useSaved';
import { useLibrary } from '../hooks/useLibrary';
import type { SavedItem, SavedItemType } from '../services/types';

type Filter = 'all' | 'dispatch' | 'signal' | 'source' | 'album';

type ResolvedSavedItem = HookSavedItem & {
  canonicalType: SavedItemType;
  unavailable: boolean;
  preview?: string;
  author?: string;
  itemCreatedAt?: string;
  linkedEntity?: string;
};

function label(type: string) {
  if (type === 'dispatch') return 'Dispatch';
  if (type === 'signal') return 'Signal';
  if (type === 'source') return 'Source';
  return 'Album';
}

function linkedEntityName(item: { supplementId?: string; brandId?: string; stackId?: string }) {
  const supplement = item.supplementId ? SUPPLEMENTS.find((candidate) => candidate.id === item.supplementId) : undefined;
  const brand = item.brandId ? BRANDS.find((candidate) => candidate.id === item.brandId) : undefined;
  const stack = item.stackId ? STACKS.find((candidate) => candidate.id === item.stackId) : undefined;
  return supplement?.name ?? brand?.name ?? stack?.name;
}

export default function Library() {
  const { status } = useAuth();
  const { savedItems, unsaveItem } = useSaved();
  const { albums, albumItems, createAlbum, deleteAlbum, addToAlbum, removeFromAlbum } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [query, setQuery] = useState('');

  const resolved: ResolvedSavedItem[] = savedItems.map((item) => {
    const canonicalType = item.type.toLowerCase() as SavedItemType;
    const post = getPosts().find((candidate) => candidate.id === item.id && candidate.type.toLowerCase() === canonicalType);
    const source = SOURCES.find((candidate) => candidate.id === item.id);
    const isPost = canonicalType === 'dispatch' || canonicalType === 'signal';
    return {
      ...item,
      canonicalType,
      title: item.title ?? post?.title ?? source?.title,
      description: item.description ?? post?.content ?? source?.url,
      preview: item.description ?? post?.content,
      url: item.url ?? source?.url,
      siteName: item.siteName ?? source?.publisher,
      author: post?.author.displayName ?? post?.author.username,
      itemCreatedAt: post?.createdAt,
      linkedEntity: item.relatedName ?? (post ? linkedEntityName(post) : undefined),
      unavailable: isPost ? !post : canonicalType === 'source' ? !source && !item.url : false,
    };
  });

  const rows = useMemo(() => {
    const albumRows = albums.map((album) => ({ ...album, type: 'album' as const, savedAt: album.updatedAt }));
    return [...resolved, ...albumRows]
      .filter((item) => filter === 'all' || ('canonicalType' in item ? item.canonicalType === filter : item.type === filter))
      .filter((item) => {
        const text = 'canonicalType' in item
          ? `${item.title ?? ''} ${item.preview ?? ''} ${item.siteName ?? ''} ${item.author ?? ''} ${item.linkedEntity ?? ''}`
          : `${item.title} ${item.description ?? ''}`;
        return text.toLowerCase().includes(query.toLowerCase());
      })
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
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Library</h1>
          <p className="text-sm text-slate-500">Private saved posts, sources, and albums.</p>
        </div>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Library" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 dark:border-zinc-800 dark:bg-zinc-900" />
        </label>
        <select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', 'dispatch', 'signal', 'source', 'album'] as Filter[]).map((tab) => (
          <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === tab ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950' : 'bg-white text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>
            {tab === 'all' ? 'All saved' : label(tab)}
          </button>
        ))}
      </div>
      <form onSubmit={submitAlbum} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 flex items-center gap-2 font-bold"><Folder size={16} /> Create album</h2>
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
          <input name="title" required placeholder="Album title" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" />
          <input name="description" placeholder="Optional description" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950" />
          <select name="privacy" defaultValue="private" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"><option value="private">Private</option><option value="public">Public</option></select>
          <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">Create</button>
        </div>
      </form>
      <div className="space-y-3">
        {rows.map((item) => 'ownerId' in item ? (
          <div key={`album-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex justify-between gap-3">
              <div><Link to={`/library/albums/${item.id}`} className="font-bold hover:underline">{item.title}</Link><p className="text-sm text-slate-500">{item.privacy} · {item.description}</p></div>
              <button onClick={() => deleteAlbum(item.id)} title="Delete album"><Trash2 size={16} /></button>
            </div>
          </div>
        ) : (
          <SavedRow key={`${item.canonicalType}-${item.id}`} item={item} albums={albums} albumItems={albumItems} onUnsave={() => unsaveItem(item.id, item.canonicalType)} onAdd={addToAlbum} onRemove={removeFromAlbum} />
        ))}
        {rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-zinc-800">No Library items match.</div>}
      </div>
    </div>
  );
}

function SavedRow({ item, albums, albumItems, onUnsave, onAdd, onRemove }: { item: ResolvedSavedItem; albums: { id: string; title: string }[]; albumItems: { id: string; albumId: string; savedItemType: SavedItemType; savedItemId: string }[]; onUnsave: () => void; onAdd: (albumId: string, item: SavedItem) => void | Promise<void>; onRemove: (albumItemId: string) => void }) {
  const linked = item.canonicalType === 'dispatch' || item.canonicalType === 'signal' ? `/post/${item.id}` : item.url;
  const current = albumItems.filter((albumItem) => albumItem.savedItemType === item.canonicalType && albumItem.savedItemId === item.id);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3"><div><span className="mb-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">{label(item.canonicalType)}</span><h3 className="font-bold">{item.unavailable ? 'Post unavailable' : item.title ?? item.id}</h3>{item.linkedEntity && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{item.linkedEntity}</p>}{item.author && <p className="text-xs text-slate-500">By {item.author}</p>}{item.preview && !item.unavailable && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.preview}</p>}<p className="mt-2 text-xs text-slate-400">Saved {new Date(item.savedAt).toLocaleString()}{item.itemCreatedAt ? ` · Posted ${new Date(item.itemCreatedAt).toLocaleString()}` : ''}</p>{linked && !item.unavailable && <a href={linked} className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"><ExternalLink size={14} /> Open</a>}</div><button onClick={onUnsave} title="Unsave"><Bookmark className="fill-current text-emerald-500" size={18} /></button></div><div className="mt-3 flex flex-wrap items-center gap-2"><select onChange={(event) => event.target.value && onAdd(event.target.value, { itemId: item.id, itemType: item.canonicalType, title: item.title, url: item.url, description: item.preview ?? item.description, siteName: item.siteName })} defaultValue="" className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950"><option value="">Add to album…</option>{albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}</select>{current.map((albumItem) => <button key={albumItem.id} onClick={() => onRemove(albumItem.id)} className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-zinc-800">Remove from {albums.find((album) => album.id === albumItem.albumId)?.title ?? 'album'}</button>)}</div></div>;
}
